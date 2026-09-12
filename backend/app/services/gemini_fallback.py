import json
import logging
import re
from typing import Dict, Any, Optional, List, Union
from app.config import get_settings
from app.services.targeted_extractors import split_merged_names

logger = logging.getLogger("udyamsetu.gemini")


class GeminiFallbackOCR:
    """
    High-accuracy Multimodal Vision Extractor using Google Gemini 1.5 Flash.
    Acts as the cloud fallback when local RapidOCR confidence is low (< 65%)
    AND the user has granted explicit permission to consult the Cloud AI.
    Supports single or multiple images (e.g. Aadhaar Front + Back).
    Runs with 0MB additional server RAM consumption.
    """

    def __init__(self):
        self.settings = get_settings()
        self.api_key = self.settings.GEMINI_API_KEY
        self.model_name = self.settings.GEMINI_MODEL
        self.client = None

        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                logger.info("Initialized Google Gemini 1.5 Flash Client.")
            except Exception as e:
                logger.warning(f"Failed to initialize google-genai Client: {e}")

    def _get_mock_gemini_extraction(self, doc_type: str) -> Dict[str, Any]:
        """Provides mock extraction when force_engine == 'MOCK'."""
        doc_type = doc_type.upper().strip()
        if doc_type == "AADHAAR":
            return {
                "doc_type": "AADHAAR",
                "name": "Sunita Devi",
                "dob": "15/08/1988",
                "gender": "Female",
                "masked_aadhaar": "XXXX-XXXX-4821",
                "address": "Village Rampur, Post Jungle Dhusan, District Gorakhpur, Uttar Pradesh - 273013",
                "state": "Uttar Pradesh",
                "district": "Gorakhpur",
                "pincode": "273013",
                "confidence": 98.0,
                "engine": "Mock",
                "needs_permission": False,
                "can_use_gemini": False,
            }
        elif doc_type == "CASTE":
            return {
                "doc_type": "CASTE",
                "category": "OBC",
                "certificate_number": "UP/OBC/2024/98214",
                "confidence": 97.5,
                "engine": "Mock",
                "needs_permission": False,
                "can_use_gemini": False,
            }
        elif doc_type == "INCOME":
            return {
                "doc_type": "INCOME",
                "annual_income": 120000.0,
                "financial_year": "2024-2025",
                "certificate_number": "INC/2024/5521",
                "confidence": 96.0,
                "engine": "Mock",
                "needs_permission": False,
                "can_use_gemini": False,
            }
        elif doc_type == "MARKSHEET":
            return {
                "doc_type": "MARKSHEET",
                "marks_percentage": 78.5,
                "highest_education": "10th",
                "confidence": 95.0,
                "engine": "Mock",
                "needs_permission": False,
                "can_use_gemini": False,
            }
        return {
            "doc_type": doc_type,
            "confidence": 50.0,
            "engine": "Mock",
            "needs_permission": False,
            "can_use_gemini": False,
        }

    def extract_targeted(
        self,
        image_input: Union[bytes, List[bytes]],
        doc_type: str,
        mime_type: str = "image/jpeg"
    ) -> Dict[str, Any]:
        """
        Extracts document fields using Google Gemini 1.5 Flash Vision.
        Accepts a single image (front, back, or combined) or multiple images (front + back).
        Enforces UIDAI 12-digit Aadhaar masking (XXXX-XXXX-1234).
        """
        images = image_input if isinstance(image_input, list) else [image_input]

        if not self.client or not self.api_key:
            logger.info("Gemini API key not configured. Returning empty/un-prefilled response.")
            return {
                "doc_type": doc_type,
                "name": None,
                "dob": None,
                "gender": None,
                "masked_aadhaar": None,
                "address": None,
                "state": None,
                "district": None,
                "pincode": None,
                "confidence": 0.0,
                "engine": "Gemini_1.5_Flash",
            }

        prompt = f"""
You are an expert document OCR engine for the Indian Government Scheme Seva Kendra portal.
Extract information from the provided {doc_type} image(s). Note: You may be provided with both the front and/or back of the document.

MANDATORY RULES:
1. Return ONLY a valid JSON object. Do not include markdown code blocks (e.g. no ```json).
2. If a field is not visible in the document image, set it strictly to null. DO NOT guess or hallucinate any data.
3. For AADHAAR:
   - "name": full legal name of the applicant. CRITICAL: Applicant name is ONLY on the FRONT side of Aadhaar.
     NEVER extract guardian names from "C/O", "S/O", "W/O", "D/O", "Care of", or from the address as applicant name!
     If ONLY the back side is uploaded or front is missing, set "name": null.
     Ensure clean spaces between first name, middle name, and surname (e.g. 'Kumar Singh', not 'Kumarsingh' or 'KumarSingh').
   - "dob": Date of birth in DD/MM/YYYY format.
   - "gender": Male | Female | Other.
   - "masked_aadhaar": UIDAI masked number. The first 8 digits MUST be masked with 'X', formatted strictly as 'XXXX-XXXX-1234' (showing ONLY the last 4 digits).
   - "address": full residential address if visible on the back side of the card.
   - "state": Indian state or Union Territory (e.g. 'Uttar Pradesh', 'Bihar').
   - "district": District name if mentioned in address (e.g. 'Gorakhpur', 'Varanasi').
   - "pincode": 6-digit postal pincode.
4. For CASTE:
   - "category": SC | ST | OBC | EWS | General (or null if not found).
   - "certificate_number": Serial or reference number of the certificate.
5. For INCOME:
   - "annual_income": numeric annual income amount in Rupees (e.g. 120000) or null.
   - "financial_year": assessment or financial year (e.g. '2024-2025') or null.
   - "certificate_number": Serial or reference number or null.
6. For MARKSHEET:
   - "marks_percentage": numeric marks percentage only if explicitly printed on the certificate (e.g. 78.4), otherwise null. DO NOT calculate, sum, or average subject scores.
   - "highest_education": strictly one of ["10th", "12th", "Diploma", "Graduate", "Post Graduate", "N/A"] or null.
     CRITICAL: Secondary School / High School / Matric / Class X is 10th.
     Senior Secondary / Higher Secondary / Intermediate / Class XII is 12th.
     Polytechnic / ITI / Industrial Training is Diploma.
     Bachelor / B.Tech / B.Sc / B.Com / B.A is Graduate.
     Master / M.Tech / M.Sc / M.A / MBA is Post Graduate.
     If not recognized or non-academic, set to "N/A".
   - "name": Student / candidate name. Ensure clean spacing between first, middle, and surname.
   - "dob": Date of birth in DD/MM/YYYY format if present.
   - "certificate_number": Roll number or certificate/registration number.

Example JSON output:
{{
  "name": "Sunita Devi",
  "dob": "15/08/1988",
  "gender": "Female",
  "masked_aadhaar": "XXXX-XXXX-9012",
  "address": "W/O Ramesh Kumar, Vill- Rampur, Dist- Gorakhpur, Uttar Pradesh - 273001",
  "state": "Uttar Pradesh",
  "district": "Gorakhpur",
  "pincode": "273001",
  "category": "OBC",
  "annual_income": 120000,
  "financial_year": "2024-2025",
  "certificate_number": "UP/CAST/2024/98712",
  "marks_percentage": 76.5,
  "highest_education": "10th"
}}
"""

        try:
            from google.genai import types

            content_parts = []
            for img_b in images:
                content_parts.append(types.Part.from_bytes(data=img_b, mime_type=mime_type))
            content_parts.append(prompt)

            response = self.client.models.generate_content(
                model=self.model_name,
                contents=content_parts
            )

            raw_text = response.text.strip()
            raw_text = re.sub(r'^```json\s*', '', raw_text)
            raw_text = re.sub(r'^```\s*', '', raw_text)
            raw_text = re.sub(r'\s*```$', '', raw_text)

            parsed = json.loads(raw_text)

            # Ensure UIDAI masking on Aadhaar
            if "masked_aadhaar" in parsed and parsed["masked_aadhaar"]:
                clean = re.sub(r'[^0-9X]', '', str(parsed["masked_aadhaar"]))
                if len(clean) >= 4:
                    last4 = clean[-4:]
                    parsed["masked_aadhaar"] = f"XXXX-XXXX-{last4}"

            # Clean and normalize name spacing
            if "name" in parsed and parsed["name"]:
                parsed["name"] = split_merged_names(str(parsed["name"]))

            parsed["doc_type"] = doc_type
            parsed["confidence"] = 98.5
            parsed["engine"] = "Gemini_1.5_Flash"
            return parsed

        except Exception as err:
            logger.error(f"Gemini 1.5 Flash Vision extraction error: {err}.")
            return {
                "doc_type": doc_type,
                "confidence": 0.0,
                "engine": "Gemini_1.5_Flash",
                "error": str(err)
            }
