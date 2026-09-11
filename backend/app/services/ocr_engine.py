import gc
import io
import logging
from typing import Dict, Any, Optional, Union, List
import numpy as np
from PIL import Image
from rapidocr_onnxruntime import RapidOCR

from app.config import get_settings
from app.services.targeted_extractors import (
    TargetedDocumentExtractor,
    classify_aadhaar_side,
    partition_aadhaar_lines,
)
from app.services.gemini_fallback import GeminiFallbackOCR

logger = logging.getLogger("udyamsetu.ocr")


class ScopedOCREngine:
    """
    Targeted Document OCR Engine with 512MB Memory Guardrails.
    - Uses RapidOCR on ONNX runtime (lightweight ~90MB-120MB).
    - Image downscaled to <= 1280px to prevent 200MB memory spikes.
    - Multi-image support (e.g. Front + Back of Aadhaar) processed sequentially
      with explicit per-image garbage collection (del img, gc.collect()).
    - USER PERMISSION MANDATE: Cloud Gemini 1.5 Flash Vision fallback is
      ONLY invoked if the user explicitly grants permission (`allow_gemini_fallback=True`).
      Otherwise, if confidence < 65%, it returns `needs_permission=True` and prompts the user.
    """

    def __init__(self):
        self.settings = get_settings()
        self.max_dim = self.settings.MAX_IMAGE_DIM
        self.ocr = RapidOCR()
        self.extractor = TargetedDocumentExtractor()
        self.gemini_fallback = GeminiFallbackOCR()
        logger.info("ScopedOCREngine initialized with RapidOCR ONNX and Targeted Extractors.")

    def downsample_image(self, image_bytes: bytes) -> Image.Image:
        """
        Downscales raw mobile smartphone photos to a maximum dimension of 1280px.
        Critical memory guardrail: raw 4K photos consume 200MB+ in PIL buffers, triggering OOM.
        """
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode != "RGB":
            img = img.convert("RGB")

        width, height = img.size
        if max(width, height) > self.max_dim:
            scale = self.max_dim / float(max(width, height))
            new_size = (int(width * scale), int(height * scale))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
            logger.info(f"Downscaled image from ({width}, {height}) to {new_size}")

        return img

    def process_targeted_document(
        self,
        image_input: Optional[Union[bytes, List[bytes]]] = None,
        doc_type: str = "AADHAAR",
        force_engine: str = "AUTO",
        allow_gemini_fallback: bool = False,
        image_bytes: Optional[bytes] = None,
    ) -> Dict[str, Any]:
        """
        Processes uploaded document image(s) and extracts targeted fields.
        image_input: Single image bytes or List of image bytes (e.g. Front + Back)
        image_bytes: Backwards-compatible single image bytes
        doc_type: 'AADHAAR' | 'CASTE' | 'INCOME' | 'MARKSHEET'
        force_engine: 'AUTO' | 'RAPIDOCR' | 'GEMINI' | 'MOCK'
        allow_gemini_fallback: User's explicit consent to use Google Gemini Cloud AI
        """
        doc_type = doc_type.upper().strip()

        target_input = image_input if image_input is not None else image_bytes

        if isinstance(target_input, (bytes, bytearray)):
            images: List[bytes] = [bytes(target_input)]
        elif isinstance(target_input, list):
            images = [bytes(b) for b in target_input if b and len(b) > 0]
        else:
            images = []

        if not images:
            raise ValueError("No valid image data provided for OCR processing.")

        try:
            # 1. Direct Mock Engine Override
            if force_engine == "MOCK":
                logger.info(f"Serving mock OCR result for doc_type={doc_type}")
                return self.gemini_fallback._get_mock_gemini_extraction(doc_type)

            # 2. Direct Gemini Force Engine (User explicitly forced or confirmed Gemini)
            if force_engine == "GEMINI":
                logger.info(f"User forced Gemini engine for doc_type={doc_type} with {len(images)} image(s)")
                return self.gemini_fallback.extract_targeted(images if len(images) > 1 else images[0], doc_type)

            # 3. Local RapidOCR ONNX Execution
            # Process each image (e.g. Front, Back) sequentially to preserve <= 280MB peak RAM
            text_lines: List[str] = []
            all_confidences: List[float] = []
            per_image_lines: List[List[str]] = []

            for idx, single_bytes in enumerate(images):
                img = None
                try:
                    img = self.downsample_image(single_bytes)
                    img_np = np.array(img)
                    result, _ = self.ocr(img_np)
                    if result:
                        confs = [float(line[2]) for line in result]
                        all_confidences.extend(confs)
                        lines = [line[1].strip() for line in result if line[1].strip()]
                        per_image_lines.append(lines)
                        text_lines.extend(lines)
                        logger.info(f"RapidOCR image [{idx+1}/{len(images)}] extracted {len(lines)} lines")
                    else:
                        per_image_lines.append([])
                finally:
                    if img is not None:
                        del img
                    if 'img_np' in locals():
                        del img_np
                    gc.collect()

            overall_confidence = (
                sum(all_confidences) / len(all_confidences) if all_confidences else 0.0
            )
            logger.info(
                f"RapidOCR total extracted {len(text_lines)} lines across {len(images)} image(s) with confidence: {overall_confidence:.2f}"
            )

            # 4. Extract targeted fields based on document type
            if doc_type == "AADHAAR":
                # Segregate front and back sides regardless of upload ordering
                front_lines: List[str] = []
                back_lines: List[str] = []

                if len(per_image_lines) == 1:
                    side = classify_aadhaar_side(per_image_lines[0])
                    if side == "FRONT":
                        front_lines = per_image_lines[0]
                    elif side == "BACK":
                        back_lines = per_image_lines[0]
                    else:
                        front_lines, back_lines = partition_aadhaar_lines(per_image_lines[0])
                elif len(per_image_lines) == 2:
                    side0 = classify_aadhaar_side(per_image_lines[0])
                    side1 = classify_aadhaar_side(per_image_lines[1])
                    if side0 == "BACK" and side1 != "BACK":
                        back_lines = per_image_lines[0]
                        front_lines = per_image_lines[1]
                    elif side1 == "BACK" and side0 != "BACK":
                        back_lines = per_image_lines[1]
                        front_lines = per_image_lines[0]
                    elif side0 == "FRONT" and side1 != "FRONT":
                        front_lines = per_image_lines[0]
                        back_lines = per_image_lines[1]
                    elif side1 == "FRONT" and side0 != "FRONT":
                        front_lines = per_image_lines[1]
                        back_lines = per_image_lines[0]
                    else:
                        for img_lines in per_image_lines:
                            f, b = partition_aadhaar_lines(img_lines)
                            front_lines.extend(f)
                            back_lines.extend(b)
                else:
                    for img_lines in per_image_lines:
                        side = classify_aadhaar_side(img_lines)
                        if side == "FRONT":
                            front_lines.extend(img_lines)
                        elif side == "BACK":
                            back_lines.extend(img_lines)
                        else:
                            f, b = partition_aadhaar_lines(img_lines)
                            front_lines.extend(f)
                            back_lines.extend(b)

                extracted = self.extractor.extract_aadhaar(
                    text_lines=text_lines,
                    front_lines=front_lines,
                    back_lines=back_lines,
                )
            elif doc_type == "CASTE":
                extracted = self.extractor.extract_caste(text_lines)
            elif doc_type == "INCOME":
                extracted = self.extractor.extract_income(text_lines)
            elif doc_type == "MARKSHEET":
                extracted = self.extractor.extract_marksheet(text_lines)
            else:
                extracted = {}

            confidence_pct = round(overall_confidence * 100, 1)
            extracted["doc_type"] = doc_type
            extracted["confidence"] = confidence_pct
            extracted["engine"] = "RapidOCR_ONNX"
            extracted["needs_permission"] = False
            extracted["can_use_gemini"] = False

            # 5. Check Confidence & Fallback Permission Gate
            # Threshold is 65% (0.65) or if critical fields could not be parsed
            has_essential_field = any(
                extracted.get(k)
                for k in ["name", "masked_aadhaar", "category", "annual_income", "marks_percentage"]
            )
            is_low_confidence = (overall_confidence < 0.65) or (len(text_lines) == 0) or (not has_essential_field)

            if is_low_confidence and force_engine == "AUTO":
                if allow_gemini_fallback:
                    # User granted explicit permission to use Gemini Cloud fallback!
                    logger.info(
                        "Local OCR confidence is low (<65%), and user granted permission for Gemini AI fallback. Invoking Gemini 1.5 Flash..."
                    )
                    gemini_result = self.gemini_fallback.extract_targeted(
                        images if len(images) > 1 else images[0], doc_type
                    )
                    gemini_result["needs_permission"] = False
                    gemini_result["can_use_gemini"] = True
                    return gemini_result
                else:
                    # User has NOT granted permission yet.
                    # DO NOT CALL GEMINI AUTOMATICALLY!
                    # Prompt user for explicit permission while returning local extraction.
                    logger.info(
                        "Local OCR confidence is low (<65%). Prompting user for permission before consulting Gemini Cloud AI."
                    )
                    extracted["needs_permission"] = True
                    extracted["can_use_gemini"] = True
                    extracted["prompt_message"] = (
                        f"Local OCR scan completed with {confidence_pct}% confidence. "
                        "Would you like to send this document to Google Gemini 1.5 Flash Cloud AI for enhanced, high-accuracy extraction?"
                    )

            return extracted

        finally:
            # 6. Aggressive Garbage Collection to maintain <= 280MB peak RAM
            gc.collect()


# Singleton Instance
_ocr_engine_instance: Optional[ScopedOCREngine] = None


def get_ocr_engine() -> ScopedOCREngine:
    global _ocr_engine_instance
    if _ocr_engine_instance is None:
        _ocr_engine_instance = ScopedOCREngine()
    return _ocr_engine_instance
