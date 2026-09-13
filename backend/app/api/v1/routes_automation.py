import os
import logging
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse

from app.models.automation_schemas import (
    FormMatchingRequest,
    FormMatchingResponse,
    FormFieldDescriptor,
    FormFieldOption
)
from app.services.form_matcher_service import get_form_matcher_service, FormMatcherService

logger = logging.getLogger("udyamsetu.routes_automation")

router = APIRouter(prefix="/automation", tags=["Web Automation & e-RPA"])


@router.post("/match-fields", response_model=FormMatchingResponse)
def match_portal_fields(
    request: FormMatchingRequest,
    matcher: FormMatcherService = Depends(get_form_matcher_service)
):
    """
    Intelligent Form Field Matcher Endpoint.
    Uses FastEmbed all-MiniLM-L6-v2 ONNX to semantically bind portal DOM form fields
    with applicant profile data. Automatically tags fields requiring human intervention
    (CAPTCHAs, Mobile/Aadhaar OTPs, Biometric scans, Bank Mandates).
    """
    try:
        response = matcher.match_form(request)
        return response
    except Exception as e:
        logger.error(f"Error executing form matching: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Form matching failed: {str(e)}")


@router.get("/script", response_class=PlainTextResponse)
def get_content_script():
    """
    Serves the latest universal content_script.js for direct 1-line execution
    or bookmarklet loading on government portals like Jan Samarth and PMEGP.
    """
    # Path to frontend public extension script
    script_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../frontend/public/extension/content_script.js"))
    if not os.path.exists(script_path):
        # Alternative path resolution
        script_path = os.path.abspath(os.path.join(os.getcwd(), "../frontend/public/extension/content_script.js"))
    
    if os.path.exists(script_path):
        with open(script_path, "r", encoding="utf-8") as f:
            return PlainTextResponse(f.read(), media_type="application/javascript")
    
    raise HTTPException(status_code=404, detail="Script not found on server")


@router.get("/rules")
def get_automation_rules() -> Dict[str, Any]:
    """
    Returns the Human-in-the-Loop (HITL) prompt policies, attention channels,
    and threshold configs for client scripts and extensions.
    """
    return {
        "engine": "FastEmbed_all-MiniLM-L6-v2",
        "semantic_threshold": 0.65,
        "high_confidence_threshold": 0.85,
        "attention_channels": [
            {
                "id": "web_audio",
                "name": "Synthetic Dual-Tone Chime",
                "description": "Native Web Audio API 440Hz -> 880Hz oscillator; 0KB download footprint."
            },
            {
                "id": "web_speech",
                "name": "Bilingual Voice Announcements",
                "description": "Web Speech Synthesis in Hindi and English."
            },
            {
                "id": "os_notification",
                "name": "Desktop Notification API",
                "description": "Fires system-level notification if tab is backgrounded or minimized."
            },
            {
                "id": "tab_flasher",
                "name": "Document Title Flasher",
                "description": "Flashes browser tab title '[⚠️ ACTION NEEDED: Enter OTP]'."
            },
            {
                "id": "visual_spotlight",
                "name": "CSS Overlay Spotlight",
                "description": "Dims the page and wraps the input with an animated pulsating amber ring with auto-focus."
            }
        ],
        "human_prompt_cases": [
            {
                "type": "CAPTCHA",
                "trigger": "Visual distortion image captcha or math puzzle",
                "action": "Pause automation, highlight captcha, sound chime, auto-focus input"
            },
            {
                "type": "MOBILE_OTP",
                "trigger": "SMS OTP input field or mobile verification modal",
                "action": "Pause automation, speak Hindi/English prompt, await 6 digits"
            },
            {
                "type": "AADHAAR_OTP",
                "trigger": "UIDAI Aadhaar e-KYC consent or OTP popup",
                "action": "Pause automation, announce Aadhaar OTP requirement, await user input"
            },
            {
                "type": "BIOMETRIC_RD",
                "trigger": "Biometric fingerprint or iris capture button",
                "action": "Pause automation, prompt citizen to place finger on scanner"
            },
            {
                "type": "BANK_MANDATE_AA",
                "trigger": "Account Aggregator consent or NetBanking penny drop",
                "action": "Pause automation, prompt kiosk operator/citizen to authenticate"
            },
            {
                "type": "FILE_UPLOAD_CONFIRM",
                "trigger": "Physical file upload input needing wet-ink signature or photo",
                "action": "Pause automation, highlight file picker for manual operator confirmation"
            },
            {
                "type": "FINAL_DECLARATION",
                "trigger": "Solemn undertaking checkbox or final irreversible submit button",
                "action": "Halt automation, present dossier verification summary, require manual click"
            }
        ]
    }


@router.get("/jansamarth-template")
def get_jansamarth_template() -> Dict[str, Any]:
    """
    Returns the canonical form schema for Jan Samarth / PMEGP Credit Linked Schemes.
    Used by the in-app interactive portal simulator and offline bookmarklet cache.
    """
    fields: List[Dict[str, Any]] = [
        # Section 1: Registration & Login
        {"field_id": "js_mobile", "name": "mobileNumber", "label": "Applicant Mobile Number", "tag_name": "input", "input_type": "text", "is_required": True, "page_section": "Login & Auth"},
        {"field_id": "js_captcha", "name": "captchaCode", "label": "Enter Captcha Shown in Image", "tag_name": "input", "input_type": "text", "is_required": True, "page_section": "Login & Auth"},
        {"field_id": "js_login_otp", "name": "loginOtp", "label": "Enter Mobile OTP", "tag_name": "input", "input_type": "text", "is_required": True, "page_section": "Login & Auth"},
        
        # Section 2: Aadhaar e-KYC & Personal Details
        {"field_id": "js_aadhaar_no", "name": "aadhaarNumber", "label": "Aadhaar Card / Virtual ID Number", "tag_name": "input", "input_type": "text", "is_required": True, "page_section": "e-KYC & Personal"},
        {"field_id": "js_aadhaar_otp", "name": "aadhaarOtp", "label": "Enter Aadhaar e-KYC OTP", "tag_name": "input", "input_type": "text", "is_required": True, "page_section": "e-KYC & Personal"},
        {"field_id": "js_full_name", "name": "applicantName", "label": "Name of the Applicant (as per Aadhaar)", "tag_name": "input", "input_type": "text", "is_required": True, "page_section": "e-KYC & Personal"},
        {"field_id": "js_father_name", "name": "fatherHusbandName", "label": "Father's / Husband's Name", "tag_name": "input", "input_type": "text", "is_required": True, "page_section": "e-KYC & Personal"},
        {"field_id": "js_dob", "name": "dateOfBirth", "label": "Date of Birth (DD/MM/YYYY)", "tag_name": "input", "input_type": "date", "is_required": True, "page_section": "e-KYC & Personal"},
        {
            "field_id": "js_gender", "name": "gender", "label": "Gender", "tag_name": "select", "input_type": "select", "is_required": True, "page_section": "e-KYC & Personal",
            "options": [{"value": "M", "label": "Male"}, {"value": "F", "label": "Female"}, {"value": "T", "label": "Transgender"}]
        },
        {
            "field_id": "js_category", "name": "socialCategory", "label": "Social Category / Caste Community", "tag_name": "select", "input_type": "select", "is_required": True, "page_section": "e-KYC & Personal",
            "options": [{"value": "1", "label": "General"}, {"value": "2", "label": "Scheduled Caste (SC)"}, {"value": "3", "label": "Scheduled Tribe (ST)"}, {"value": "4", "label": "Other Backward Class (OBC)"}, {"value": "5", "label": "Minority / EWS"}]
        },
        {
            "field_id": "js_area", "name": "locationType", "label": "Proposed Unit Location (Rural / Urban)", "tag_name": "select", "input_type": "select", "is_required": True, "page_section": "e-KYC & Personal",
            "options": [{"value": "RUR", "label": "Rural"}, {"value": "URB", "label": "Urban"}]
        },
        {
            "field_id": "js_education", "name": "highestQualification", "label": "Educational Qualification", "tag_name": "select", "input_type": "select", "is_required": True, "page_section": "e-KYC & Personal",
            "options": [{"value": "LIT", "label": "Under 8th Pass"}, {"value": "10TH", "label": "10th Pass (Matriculation)"}, {"value": "12TH", "label": "12th Pass (Higher Secondary)"}, {"value": "ITI", "label": "ITI / Diploma"}, {"value": "GRAD", "label": "Graduate / Post Graduate"}]
        },

        # Section 3: Financial & Project Details
        {"field_id": "js_pan", "name": "panNumber", "label": "Permanent Account Number (PAN)", "tag_name": "input", "input_type": "text", "is_required": False, "page_section": "Financial & Project"},
        {"field_id": "js_annual_income", "name": "annualIncome", "label": "Total Annual Household Income (INR)", "tag_name": "input", "input_type": "number", "is_required": True, "page_section": "Financial & Project"},
        {"field_id": "js_project_cost", "name": "requiredCapital", "label": "Proposed Project Cost / Loan Amount (INR)", "tag_name": "input", "input_type": "number", "is_required": True, "page_section": "Financial & Project"},
        {"field_id": "js_own_contrib", "name": "promoterMargin", "label": "Own Contribution / Margin Money (INR)", "tag_name": "input", "input_type": "number", "is_required": True, "page_section": "Financial & Project"},
        {"field_id": "js_trade", "name": "businessActivity", "label": "Proposed Trade / Business Activity", "tag_name": "input", "input_type": "text", "is_required": True, "page_section": "Financial & Project"},

        # Section 4: Bank Details & Verification
        {"field_id": "js_bank_acc", "name": "bankAccountNumber", "label": "Primary Bank Savings Account Number", "tag_name": "input", "input_type": "text", "is_required": True, "page_section": "Bank & Mandate"},
        {"field_id": "js_bank_ifsc", "name": "bankIfscCode", "label": "Bank Branch IFSC Code", "tag_name": "input", "input_type": "text", "is_required": True, "page_section": "Bank & Mandate"},
        {"field_id": "js_account_aggregator", "name": "aaConsent", "label": "Authorize Account Aggregator for Bank Statement", "tag_name": "input", "input_type": "text", "is_required": True, "page_section": "Bank & Mandate"},

        # Section 5: Documents & Declarations
        {"field_id": "js_doc_caste", "name": "casteDoc", "label": "Upload Caste / Community Certificate (PDF/JPG)", "tag_name": "input", "input_type": "file", "is_required": False, "page_section": "Documents & Undertaking"},
        {"field_id": "js_declaration", "name": "legalUndertaking", "label": "I hereby declare that all information given is true and I am not a defaulter in any bank", "tag_name": "input", "input_type": "checkbox", "is_required": True, "page_section": "Documents & Undertaking"}
    ]

    return {
        "portal_name": "Jan Samarth (National Portal for Credit Linked Government Schemes)",
        "portal_url": "https://www.jansamarth.in",
        "supported_schemes": ["PMEGP", "PM-SVANidhi", "Mudra Pratham", "DDU-GKY"],
        "total_fields": len(fields),
        "fields": fields
    }
