import logging
from typing import Optional, List
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, status
from app.models.schemas import OcrExtractedResponse
from app.services.ocr_engine import get_ocr_engine

logger = logging.getLogger("udyamsetu.routes.ocr")

router = APIRouter(prefix="/ocr", tags=["Targeted OCR & Document Extraction"])


@router.post(
    "/extract-targeted",
    response_model=OcrExtractedResponse,
    summary="Targeted Document OCR with Permission-Gated Gemini Fallback",
    description=(
        "Extracts targeted data from Aadhaar (Front and/or Back), Caste, Income, or Marksheet documents. "
        "Supports single or multiple file uploads (e.g. 2 files for Aadhaar Front + Back). "
        "Processes locally with RapidOCR ONNX under 512MB RAM ceiling. "
        "If confidence < 65%, Gemini 1.5 Flash Cloud AI fallback is ONLY called if `allow_gemini_fallback=True`."
    ),
)
async def extract_targeted_document(
    files: Optional[List[UploadFile]] = File(None, description="Uploaded document image(s) (e.g. front and back)"),
    file: Optional[UploadFile] = File(None, description="Single uploaded document image (backwards compatibility)"),
    doc_type: str = Form(..., description="Target document: AADHAAR | CASTE | INCOME | MARKSHEET"),
    force_engine: str = Form("AUTO", description="Engine mode: AUTO | RAPIDOCR | GEMINI | MOCK"),
    allow_gemini_fallback: bool = Form(False, description="User's explicit consent to use Google Gemini Cloud AI"),
):
    valid_doc_types = ["AADHAAR", "CASTE", "INCOME", "MARKSHEET"]
    clean_doc_type = doc_type.upper().strip()

    if clean_doc_type not in valid_doc_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid doc_type '{doc_type}'. Must be one of {valid_doc_types}.",
        )

    # Collect all uploaded files (supports both multi-file 'files' and single-file 'file')
    upload_list: List[UploadFile] = []
    if files:
        upload_list.extend([f for f in files if f.filename])
    if file and file.filename and file not in upload_list:
        upload_list.append(file)

    if not upload_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files uploaded. Please upload at least one document image.",
        )

    # Read image bytes sequentially
    images_bytes: List[bytes] = []
    for f in upload_list:
        try:
            b = await f.read()
            if b and len(b) > 0:
                images_bytes.append(b)
        except Exception as e:
            logger.error(f"Failed to read uploaded file '{f.filename}': {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to read uploaded image file: {f.filename}",
            )

    if not images_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file(s) are empty.",
        )

    ocr_engine = get_ocr_engine()

    try:
        extracted = ocr_engine.process_targeted_document(
            image_input=images_bytes if len(images_bytes) > 1 else images_bytes[0],
            doc_type=clean_doc_type,
            force_engine=force_engine,
            allow_gemini_fallback=allow_gemini_fallback,
        )
        return extracted
    except Exception as e:
        logger.error(f"Document OCR extraction failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR processing failed: {str(e)}",
        )

