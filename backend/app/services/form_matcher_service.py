import logging
import re
import time
from typing import List, Dict, Any, Optional, Tuple
import numpy as np

from app.models.automation_schemas import (
    FormFieldDescriptor,
    CitizenProfilePayload,
    FieldMappingResult,
    FieldMappingAction,
    HumanActionType,
    FormMatchingRequest,
    FormMatchingResponse,
)
from app.services.embedding_service import get_embedding_service

logger = logging.getLogger("udyamsetu.automation")

# ---------------------------------------------------------------------------
# Canonical Field Anchors for FastEmbed Cosine Similarity
# ---------------------------------------------------------------------------
PROFILE_FIELD_ANCHORS = {
    "name": [
        "Applicant Full Name", "Candidate Name", "Name of the Applicant",
        "Beneficiary Name", "Aavedak ka Naam", "Full Name as per Aadhaar"
    ],
    "father_name": [
        "Father's Name", "Husband's Name", "Guardian Name", "Father / Husband Name",
        "Pita ya Pati ka Naam", "Parent or Spouse Name"
    ],
    "mother_name": [
        "Mother's Name", "Mata ka Naam", "Mother Full Name"
    ],
    "dob": [
        "Date of Birth", "DOB", "Janam Tithi", "Birth Date", "Age / Date of Birth"
    ],
    "gender": [
        "Gender", "Sex", "Ling", "Male Female Other"
    ],
    "category": [
        "Social Category", "Caste Category", "Community", "Caste", "Samajik Varg",
        "Category (SC/ST/OBC/General/EWS)"
    ],
    "marital_status": [
        "Marital Status", "Vaivahik Sthiti", "Married Single Unmarried"
    ],
    "is_differently_abled": [
        "Physically Handicapped", "Specially Abled", "Divyangjan", "PH Status", "Person with Disability"
    ],
    "is_ex_serviceman": [
        "Ex-Serviceman", "Bhootpoorva Sainik", "Defense Personnel Ex-Service"
    ],
    "annual_income": [
        "Annual Family Income", "Gross Household Income", "Annual Income (INR)",
        "Total Annual Income", "Varshik Aay", "Family Earnings"
    ],
    "masked_aadhaar": [
        "Aadhaar Number", "UIDAI Aadhaar No", "Aadhaar Card No", "Masked Aadhaar", "UID Virtual ID"
    ],
    "pan_number": [
        "PAN Number", "Permanent Account Number", "Income Tax PAN", "PAN Card"
    ],
    "mobile_number": [
        "Mobile Number", "Registered Mobile", "Contact Number", "Phone Number", "Door-bhash Sankhya"
    ],
    "email": [
        "Email Address", "Email ID", "Electronic Mail", "E-mail"
    ],
    "state": [
        "State", "State / UT", "Rajya", "Domicile State"
    ],
    "district": [
        "District", "Zila", "District Name"
    ],
    "block": [
        "Block", "Taluka", "Tehsil", "Mandal", "Sub-District"
    ],
    "pincode": [
        "Pincode", "Postal Code", "PIN Code", "Postal PIN"
    ],
    "address": [
        "Permanent Address", "Communication Address", "Residential Address", "Full Address", "Pata"
    ],
    "area_type": [
        "Area Type", "Rural / Urban", "Location Type", "Gramin / Shehri"
    ],
    "education": [
        "Educational Qualification", "Highest Qualification", "Education", "Shiksha", "Academic Qualification"
    ],
    "profession": [
        "Profession", "Occupation", "Vyavasay", "Present Trade", "Job Occupation"
    ],
    "trade_or_activity": [
        "Proposed Business Activity", "Trade Name", "Industry / Activity Type", "Project Activity", "Sector"
    ],
    "required_capital": [
        "Required Loan Amount", "Project Cost", "Total Capital Required", "Sanction Amount", "Loan Required",
        "Capital Expenditure", "Working Capital", "Capital Cost", "Total Project Cost", "Poonji", "Lagat"
    ],
    "own_contribution": [
        "Own Contribution", "Promoter Margin", "Beneficiary Share", "Margin Money"
    ],
    "bank_account_no": [
        "Bank Account Number", "Savings Account No", "Bank Khata Sankhya", "A/C Number"
    ],
    "bank_ifsc": [
        "Bank IFSC Code", "IFSC", "Branch IFSC", "RTGS/NEFT IFSC Code"
    ],
    "bank_name": [
        "Bank Name", "Name of the Bank", "Preferred Bank"
    ],
    "bank_branch": [
        "Bank Branch", "Branch Name", "Bank Branch Location"
    ],
    "caste_certificate_no": [
        "Caste Certificate Number", "Jati Praman Patra Sankhya", "Caste Doc Ref"
    ],
    "income_certificate_no": [
        "Income Certificate Number", "Aay Praman Patra Sankhya", "Income Doc Ref"
    ],
    "edp_trained": [
        "EDP Training", "RSETI Trained", "Entrepreneurship Development Programme", "Past Training Completed"
    ],
    "sponsoring_agency": [
        "Sponsoring Agency", "Agency Name", "KVIC KVIB DIC", "Implementing Agency", "Prayojak Agency"
    ],
    "legal_type": [
        "Legal Type", "Constitution of Beneficiary", "Individual Beneficiary", "Applicant Status"
    ],
    "unit_location": [
        "Unit Location", "Location Type", "Rural Urban Unit", "Gramin Shehri Unit", "Proposed Location"
    ],
    "unit_address": [
        "Proposed Unit Address", "Work Place Address", "Factory Address", "Karyasthala Pata"
    ],
    "unit_pincode": [
        "Unit Pincode", "Proposed Unit PIN Code", "Location Pincode"
    ]
}

# Regex patterns for detecting Human Attention fields
CAPTCHA_REGEX = re.compile(r"captcha|security\s*code|enter\s*code|shown\s*above|verification\s*code", re.IGNORECASE)
MOBILE_OTP_REGEX = re.compile(r"mobile\s*otp|sms\s*otp|phone\s*otp|otp\s*received|enter\s*otp|login\s*otp", re.IGNORECASE)
AADHAAR_OTP_REGEX = re.compile(r"aadhaar\s*otp|uidai\s*otp|ekyc\s*otp|aadhaar\s*auth", re.IGNORECASE)
BIOMETRIC_REGEX = re.compile(r"biometric|fingerprint|iris\s*scan|capture\s*bio|rd\s*service", re.IGNORECASE)
BANK_MANDATE_REGEX = re.compile(r"account\s*aggregator|net\s*banking|penny\s*drop|e-mandate|bank\s*mandate|consent\s*approval", re.IGNORECASE)
DECLARATION_REGEX = re.compile(r"i\s*hereby\s*declare|i\s*undertake|solemnly\s*affirm|terms\s*and\s*conditions|i\s*agree\s*to\s*the\s*declaration", re.IGNORECASE)


def sanitize_form_label_py(text: str) -> str:
    """
    Keeps core label and short hints (<=9 chars like '(in Rs.)', '(dd-mm-yy)'),
    while ignoring long instructional paragraphs, tooltips, disclaimers,
    and stripping leading numbering (e.g. '1. ', '2. ', '(a) ').
    """
    if not text:
        return ""
    cleaned = text.strip()
    # Strip leading list/row numbering (e.g. "1. ", "2. ", "(1) ", "1) ", "1- ", "(a) ")
    cleaned = re.sub(r"^[\(\[]?\d+[A-Za-z]?[\)\]\.\-\:]\s*", "", cleaned)
    cleaned = re.sub(r"^[\(\[][a-zA-Z][\)\]\.\-\:]\s*", "", cleaned)

    lines = [l.strip() for l in cleaned.splitlines() if l.strip()]
    if len(lines) > 1:
        title_line = next(
            (l for l in lines if not re.match(r"^(note|ध्यान दें|सूचना|note\s*:-)", l, re.I) and len(l) <= 65),
            None
        )
        cleaned = title_line or lines[0]
        cleaned = re.sub(r"^[\(\[]?\d+[A-Za-z]?[\)\]\.\-\:]\s*", "", cleaned)
    if ":" in cleaned:
        parts = re.split(r"\s*:\s*", cleaned)
        if len(parts) > 1 and (len(parts[1]) > 25 or re.match(r"^(note|12 digit|digit|should|ambiguity|कृपया)", parts[1], re.I)):
            cleaned = parts[0]
    # Keep hints <= 9 chars, drop long parenthetical descriptions
    cleaned = re.sub(r"\([^)]{10,}\)", " ", cleaned)
    cleaned = re.sub(r"\[[^\]]{10,}\]", " ", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip()


class FormMatcherService:
    """
    Intelligent Form Matcher utilizing FastEmbed (all-MiniLM-L6-v2) ONNX.
    Reuses existing singleton model weights (~60MB RAM) for 0MB additional memory overhead.
    Computes semantic cosine similarity between live portal DOM fields and Citizen Profile attributes.
    """

    def __init__(self):
        self.embedder = get_embedding_service()
        self._anchor_embeddings: Dict[str, np.ndarray] = {}
        self._precompute_anchor_embeddings()

    def _precompute_anchor_embeddings(self):
        """Pre-computes and normalizes mean embedding vectors for all profile fields."""
        try:
            for field_name, phrases in PROFILE_FIELD_ANCHORS.items():
                vectors = self.embedder.embed(phrases)
                if vectors:
                    mean_vec = np.mean(vectors, axis=0)
                    norm = np.linalg.norm(mean_vec)
                    self._anchor_embeddings[field_name] = (mean_vec / norm) if norm > 0 else mean_vec
            logger.info(f"FormMatcherService pre-indexed {len(self._anchor_embeddings)} canonical field anchors.")
        except Exception as e:
            logger.warning(f"Failed to precompute anchor embeddings: {e}")

    def _detect_human_attention_case(self, field: FormFieldDescriptor) -> Tuple[bool, HumanActionType, Optional[str], Optional[str]]:
        """
        Pinpoints the exact scenario requiring human intervention on government portals like Jan Samarth.
        Returns: (requires_human, action_type, message_en, message_hi)
        """
        combined_text = f"{field.label} {field.name or ''} {field.placeholder or ''} {field.aria_label or ''} {field.field_id}".lower()

        # 1. CAPTCHA Check
        if CAPTCHA_REGEX.search(combined_text):
            return (
                True,
                HumanActionType.CAPTCHA,
                "Action Required: Please solve the visual CAPTCHA verification code to proceed.",
                "ध्यान दें: कृपया आगे बढ़ने के लिए सुरक्षा कैप्चा कोड दर्ज करें।"
            )

        # 2. Aadhaar eKYC OTP Check
        if AADHAAR_OTP_REGEX.search(combined_text):
            return (
                True,
                HumanActionType.AADHAAR_OTP,
                "Aadhaar Authentication: Please enter the 6-digit UIDAI OTP received on your linked mobile.",
                "आधार सत्यापन: कृपया अपने आधार से जुड़े मोबाइल नंबर पर आया 6-अंकों का OTP दर्ज करें।"
            )

        # 3. Mobile / SMS / General OTP Check (Checked before any profile matching!)
        if (
            getattr(field, 'is_otp', False) or
            MOBILE_OTP_REGEX.search(combined_text) or
            re.search(r"\botp\b|one[\s_-]*time[\s_-]*(password|code|pin)|verification[\s_-]*code|auth[\s_-]*code|ओटीपी", combined_text, re.IGNORECASE) or
            (field.aria_label and "one-time-code" in field.aria_label.lower()) or
            (field.name and "otp" in field.name.lower()) or
            (field.field_id and "otp" in field.field_id.lower())
        ):
            return (
                True,
                HumanActionType.MOBILE_OTP,
                "Mobile Verification: Please enter the SMS OTP sent to your phone to authenticate.",
                "मोबाइल सत्यापन: कृपया अपने फोन पर SMS द्वारा प्राप्त OTP दर्ज करें।"
            )

        # 4. Biometric RD Service Check
        if BIOMETRIC_REGEX.search(combined_text):
            return (
                True,
                HumanActionType.BIOMETRIC_RD,
                "Biometric Device: Please place the applicant's finger on the connected scanner.",
                "बायोमेट्रिक डिवाइस: कृपया कनेक्टेड स्कैनर पर आवेदक की अंगुली रखें।"
            )

        # 5. Jan Samarth Bank Mandate / Account Aggregator
        if BANK_MANDATE_REGEX.search(combined_text):
            return (
                True,
                HumanActionType.BANK_MANDATE_AA,
                "Bank Authorization: Please approve Account Aggregator consent or complete NetBanking penny-drop.",
                "बैंक प्राधिकरण: कृपया अकाउंट एग्रीगेटर सहमति या नेटबैंकिंग सत्यापन पूर्ण करें।"
            )

        # 6. Physical Document Upload Confirmation
        if field.input_type == "file" or field.tag_name == "file":
            return (
                True,
                HumanActionType.FILE_UPLOAD_CONFIRM,
                "Document Confirmation: Please review and confirm the upload of the required certificate or signed document.",
                "दस्तावेज़ पुष्टि: कृपया संबंधित प्रमाण पत्र या हस्ताक्षरित दस्तावेज़ के अपलोड की पुष्टि करें।"
            )

        # 7. Final Undertaking / Declaration Checkbox
        if field.input_type == "checkbox" and DECLARATION_REGEX.search(combined_text):
            return (
                True,
                HumanActionType.FINAL_DECLARATION,
                "Final Review & Declaration: Please verify populated details and check the undertaking before final submission.",
                "अंतिम घोषणा: कृपया भरे गए विवरणों की जांच करें और अंतिम सबमिशन से पहले घोषणा को चेक करें।"
            )

        return (False, HumanActionType.NONE, None, None)

    def _resolve_option_value(self, profile_value: Any, options: List[Any]) -> Tuple[Optional[str], Optional[str], float]:
        """
        Resolves the exact HTML <option value="..."> for <select> and radio groups.
        Uses embedding cosine similarity to match applicant value (e.g. 'SC') to portal options
        (e.g. [{"value": "1", "label": "Scheduled Caste (SC)"}]).
        """
        if not options or profile_value is None:
            return (None, None, 0.0)

        target_str = str(profile_value).strip().lower()
        target_vec = self.embedder.embed_single(target_str)

        best_val = None
        best_label = None
        best_sim = -1.0

        for opt in options:
            opt_val = str(getattr(opt, "value", opt.get("value", "") if isinstance(opt, dict) else "")).strip()
            opt_lbl = str(getattr(opt, "label", opt.get("label", "") if isinstance(opt, dict) else opt_val)).strip()
            
            # Direct exact substring match gets priority 1.0
            opt_lbl_lower = opt_lbl.lower()
            if target_str == opt_val.lower() or target_str == opt_lbl_lower:
                return (opt_val, opt_lbl, 1.0)
            if target_str in opt_lbl_lower or opt_val.lower() in target_str:
                return (opt_val, opt_lbl, 0.95)

            # Semantic similarity comparison
            opt_vec = self.embedder.embed_single(f"{opt_val} {opt_lbl}")
            sim = float(self.embedder.cosine_similarity(target_vec, opt_vec))
            if sim > best_sim:
                best_sim = sim
                best_val = opt_val
                best_label = opt_lbl

        return (best_val, best_label, max(0.0, best_sim))

    def _format_value(self, raw_value: Any, input_type: Optional[str]) -> Tuple[Any, str]:
        """Formats dates, numbers, and strings cleanly according to input constraints."""
        if raw_value is None:
            return (None, "")

        # Date formatting
        if input_type == "date" and isinstance(raw_value, str):
            # Convert DD/MM/YYYY to YYYY-MM-DD for HTML5 date inputs
            match = re.match(r"^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$", raw_value.strip())
            if match:
                d, m, y = match.groups()
                formatted = f"{y}-{int(m):02d}-{int(d):02d}"
                return (formatted, formatted)

        # Numbers
        if input_type == "number":
            if isinstance(raw_value, (int, float)):
                return (raw_value, str(raw_value))
            num_match = re.search(r"[\d.]+", str(raw_value))
            if num_match:
                val = float(num_match.group(0))
                return (val, str(val))

        str_val = str(raw_value).strip()
        return (str_val, str_val)

    def _heuristic_keyword_match(self, query: str, profile_dict: dict) -> Tuple[Optional[str], float]:
        """
        Deterministic keyword match fallback when FastEmbed is in mock mode
        or semantic vector confidence is low.
        """
        q_lower = query.lower()

        # OTP / Verification codes must NEVER match mobile_number or any other profile attribute!
        if re.search(r"\botp\b|one[\s_-]*time|verification[\s_-]*code|auth[\s_-]*code|ओटीपी", q_lower):
            return (None, 0.0)
        
        # Ordered by specificity (Address & Location checked before PAN to prevent address/PAN collisions)
        rules = [
            ("aadhaar_otp", [r"\b(aadhaar\s*otp|uidai\s*otp|ekyc\s*otp)\b"]),
            ("mobile_number", [r"\b(mobile|phone\s*number|contact\s*number|telephone|door[-_\s]*bhash)\b", r"मोबाइल|दूरभाष"]),
            ("masked_aadhaar", [r"\b(aadhaar|uidai|uid\s*number|virtual\s*id)\b", r"आधार"]),
            ("address", [r"\b(address|residential|communication|permanent\s*address|pata)\b", r"पता|निवास"]),
            ("pincode", [r"\b(pincode|pin\s*code|postal\s*code)\b", r"पिन\s*कोड"]),
            ("district", [r"\b(district|zila)\b", r"ज़िला"]),
            ("state", [r"\b(state|rajya|domicile)\b", r"राज्य"]),
            ("pan_number", [r"\b(pan\s*number|pan\s*card|pan\s*no|permanent\s*account\s*number)\b", r"पैन\s*(?:कार्ड|नं|नंबर)"]),
            ("father_name", [r"\b(father|husband|guardian|pita|pati|parent\s*name|spouse)\b", r"पिता|पति"]),
            ("mother_name", [r"\b(mother|mata)\b", r"माता"]),
            ("dob", [r"\b(birth|dob|janam|date\s*of\s*birth)\b", r"जन्म\s*तिथि"]),
            ("annual_income", [r"\b(annual\s*income|family\s*income|gross\s*income|income|earnings|annual\s*gross)\b", r"वार्षिक\s*आय|आय"]),
            ("category", [r"\b(category|caste|community|social\s*category|varg|sc/st)\b", r"सामाजिक\s*श्रेणी|जाति"]),
            ("gender", [r"\b(gender|sex)\b", r"लिंग"]),
            ("marital_status", [r"\b(marital|marital\s*status|married|unmarried|vivah)\b", r"वैवाहिक"]),
            ("is_differently_abled", [r"\b(handicap|divyang|disability|specially\s*abled)\b", r"दिव्यांग"]),
            ("is_ex_serviceman", [r"\b(ex[-_\s]*serviceman|bhootpoorva)\b"]),
            ("education", [r"\b(qualification|education|shiksha|academic)\b", r"शैक्षणिक|शिक्षा"]),
            ("bank_account_no", [r"\b(account\s*number|bank\s*account|khata|a/c\s*no)\b", r"खाता\s*संख्या"]),
            ("bank_ifsc", [r"\b(ifsc|ifsc\s*code)\b", r"आईएफएससी"]),
            ("bank_name", [r"\b(bank\s*name|bank)\b", r"बैंक"]),
            ("bank_branch", [r"\b(branch\s*name|branch|shakha)\b", r"शाखा"]),
            ("required_capital", [r"\b(project\s*cost|loan\s*amount|capital\s*required|capital\s*expenditure|working\s*capital|capital|sanction)\b", r"लागत|पूंजी"]),
            ("own_contribution", [r"\b(own\s*contribution|promoter\s*margin|margin\s*money|beneficiary\s*share)\b", r"अंशदान|मार्जिन"]),
            ("trade_or_activity", [r"\b(activity|trade|sector|business|occupation)\b", r"व्यवसाय"]),
            ("profession", [r"\b(profession|vyavasay)\b"]),
            ("sponsoring_agency", [r"\b(sponsoring\s*agency|agency|kvic|kvib|dic)\b", r"एजेंसी"]),
            ("legal_type", [r"\b(legal\s*type|constitution)\b", r"कानूनी\s*प्रकार"]),
            ("unit_location", [r"\b(unit\s*location|proposed\s*unit\s*location|location\s*type)\b", r"इकाई\s*का\s*स्थान"]),
            ("unit_address", [r"\b(unit\s*address|proposed\s*unit\s*address|work\s*place\s*address)\b", r"इकाई\s*का\s*पता"]),
            ("unit_pincode", [r"\b(unit\s*pin|unit\s*pincode|proposed\s*unit\s*pin)\b"]),
            ("name", [r"\b(applicant\s*name|candidate\s*name|full\s*name|beneficiary\s*name|aavedak|name\s*of\s*(?:the\s*)?applicant|name\s*of\s*(?:the\s*)?candidate)\b", r"आवेदक\s*का\s*नाम"]),
        ]

        for prof_key, pat_list in rules:
            if profile_dict.get(prof_key) is not None:
                for pat in pat_list:
                    if re.search(pat, q_lower, re.IGNORECASE):
                        return (prof_key, 0.92)
        return (None, 0.0)

    def match_form(self, request: FormMatchingRequest) -> FormMatchingResponse:
        """
        Executes end-to-end matching for a form schema against citizen profile.
        Leverages FastEmbed all-MiniLM-L6-v2 ONNX embeddings enhanced with regex accuracy filtering.
        """
        start_time = time.time()
        profile_dict = request.profile.model_dump()
        mappings: List[FieldMappingResult] = []

        auto_fill_count = 0
        human_action_count = 0
        unmatched_count = 0

        # Collect field texts for batch embedding (cleaned with short-hint retention)
        field_queries = []
        for field in request.fields:
            clean_lbl = sanitize_form_label_py(field.label)
            combined = f"{clean_lbl} {field.placeholder or ''} {field.name or ''} {field.aria_label or ''}".strip()
            field_queries.append(combined)

        field_vectors = self.embedder.embed(field_queries)

        for idx, field in enumerate(request.fields):
            q_clean = field_queries[idx].lower()
            is_textarea = (field.tag_name or "").lower() == "textarea"

            # 1. First check if this is a mandatory Human Attention trigger (CAPTCHA, OTP, Biometric, etc.)
            req_human, act_type, msg_en, msg_hi = self._detect_human_attention_case(field)
            if req_human:
                mappings.append(
                    FieldMappingResult(
                        field_id=field.field_id,
                        action=FieldMappingAction.HUMAN_INPUT_REQUIRED,
                        suggested_value=None,
                        display_value=None,
                        confidence=1.0,
                        matched_profile_field=None,
                        requires_human=True,
                        human_action_type=act_type,
                        human_prompt_message_en=msg_en,
                        human_prompt_message_hi=msg_hi,
                        match_reason=f"Security/Verification gate detected ({act_type.value})"
                    )
                )
                human_action_count += 1
                continue

            # 2. Strict Aadhaar Manual Entry Requirement (UIDAI Security Policy)
            if getattr(field, 'is_aadhaar', False) or re.search(r"\b(aadhaar|uidai|virtual\s*id)\b|आधार", q_clean):
                mappings.append(
                    FieldMappingResult(
                        field_id=field.field_id,
                        action=FieldMappingAction.HUMAN_INPUT_REQUIRED,
                        suggested_value=None,
                        display_value=None,
                        confidence=1.0,
                        matched_profile_field="masked_aadhaar",
                        requires_human=True,
                        human_action_type=HumanActionType.AADHAAR_MANUAL_ENTRY,
                        human_prompt_message_en="Aadhaar Security: Please manually type your 12-digit Aadhaar number to verify.",
                        human_prompt_message_hi="आधार सुरक्षा: कृपया सत्यापन के लिए अपना 12-अंकों का आधार नंबर स्वयं दर्ज करें।",
                        match_reason="Aadhaar manual entry mandatory per UIDAI security policies"
                    )
                )
                human_action_count += 1
                continue

            # 3. Matching against canonical profile attributes using all-MiniLM-L6-v2 + Regex Accuracy Booster
            best_field = None
            best_score = -1.0

            if self.embedder.is_mock_mode():
                # In mock mode, use deterministic regex keyword matching
                h_field, h_score = self._heuristic_keyword_match(field_queries[idx], profile_dict)
                best_field = h_field
                best_score = h_score if h_field else 0.0
            else:
                f_vec = field_vectors[idx] if idx < len(field_vectors) else self.embedder.embed_single(field_queries[idx])
                for prof_key, anchor_vec in self._anchor_embeddings.items():
                    sim = float(self.embedder.cosine_similarity(f_vec, anchor_vec))
                    if sim > best_score:
                        best_score = sim
                        best_field = prof_key

                # Heuristic token fallback if similarity is under threshold
                if best_score < 0.65:
                    h_field, h_score = self._heuristic_keyword_match(field_queries[idx], profile_dict)
                    if h_field and h_score > best_score:
                        best_field = h_field
                        best_score = h_score

            # 4. REGEX ACCURACY BOOSTER FOR SEMANTIC MATCHING
            # A. Address Booster: textarea or address keywords must firmly match 'address'
            if is_textarea or re.search(r"\b(address|residential|communication|permanent\s*address|pata)\b|पता|निवास", q_clean):
                if not re.search(r"\b(project|activity|trade|remarks|description)\b", q_clean):
                    best_field = "address"
                    best_score = max(0.95, best_score)

            # B. PAN Card Accuracy Filter: PAN cannot be textarea and cannot have address context
            if best_field == "pan_number":
                if is_textarea or re.search(r"\b(address|residential|communication|pata)\b|पता|निवास", q_clean):
                    best_field = "address"
                    best_score = 0.92
                elif not re.search(r"\b(pan\s*card|pan\s*no|pan\s*number|permanent\s*account\s*number)\b|पैन", q_clean):
                    best_field = None
                    best_score = 0.0

            # C. Capital Expenditure Booster: Never collide with father_name
            if re.search(r"\b(project\s*cost|capital\s*expenditure|working\s*capital|capital|loan\s*amount)\b|लागत|पूंजी", q_clean):
                if best_field == "father_name":
                    best_field = "required_capital"
                    best_score = 0.95

            # Derivation and fallback for related government fields
            if best_field == "unit_location" and not profile_dict.get("unit_location"):
                profile_dict["unit_location"] = profile_dict.get("area_type")
            elif best_field == "unit_address" and not profile_dict.get("unit_address"):
                profile_dict["unit_address"] = profile_dict.get("address")
            elif best_field == "unit_pincode" and not profile_dict.get("unit_pincode"):
                profile_dict["unit_pincode"] = profile_dict.get("pincode")
            elif best_field == "sponsoring_agency" and not profile_dict.get("sponsoring_agency"):
                profile_dict["sponsoring_agency"] = "KVIC"
            elif best_field == "legal_type" and not profile_dict.get("legal_type"):
                profile_dict["legal_type"] = "Individual"

            # Thresholding: 0.65 threshold for semantic match
            has_val = (
                best_field is not None
                and profile_dict.get(best_field) is not None
                and str(profile_dict.get(best_field)).strip() != ""
            )

            if best_field and best_score >= 0.65 and has_val:
                raw_val = profile_dict.get(best_field)

                # If the field is a dropdown <select> or radio group with options
                if field.tag_name == "select" or field.input_type in ["radio", "select"]:
                    resolved_val, display_lbl, opt_conf = self._resolve_option_value(raw_val, field.options or [])
                    mappings.append(
                        FieldMappingResult(
                            field_id=field.field_id,
                            action=FieldMappingAction.AUTO_SELECT,
                            suggested_value=resolved_val if resolved_val is not None else raw_val,
                            display_value=display_lbl or str(raw_val),
                            confidence=round(best_score * opt_conf, 3),
                            matched_profile_field=best_field,
                            requires_human=False,
                            human_action_type=HumanActionType.NONE,
                            match_reason=f"Matched profile.{best_field} (cosine: {best_score:.2f}) -> Option: {display_lbl}"
                        )
                    )
                    auto_fill_count += 1
                elif field.input_type == "checkbox":
                    bool_val = bool(raw_val)
                    mappings.append(
                        FieldMappingResult(
                            field_id=field.field_id,
                            action=FieldMappingAction.AUTO_CHECK,
                            suggested_value=bool_val,
                            display_value="Checked" if bool_val else "Unchecked",
                            confidence=round(best_score, 3),
                            matched_profile_field=best_field,
                            requires_human=False,
                            human_action_type=HumanActionType.NONE,
                            match_reason=f"Matched profile.{best_field} (cosine: {best_score:.2f})"
                        )
                    )
                    auto_fill_count += 1
                else:
                    fmt_val, disp_val = self._format_value(raw_val, field.input_type)
                    mappings.append(
                        FieldMappingResult(
                            field_id=field.field_id,
                            action=FieldMappingAction.AUTO_FILL,
                            suggested_value=fmt_val,
                            display_value=disp_val,
                            confidence=round(best_score, 3),
                            matched_profile_field=best_field,
                            requires_human=False,
                            human_action_type=HumanActionType.NONE,
                            match_reason=f"Matched profile.{best_field} (cosine: {best_score:.2f})"
                        )
                    )
                    auto_fill_count += 1
            elif best_field and best_score >= 0.65 and not has_val:
                # Field recognized by AI, but Citizen Profile does not have the value
                mappings.append(
                    FieldMappingResult(
                        field_id=field.field_id,
                        action=FieldMappingAction.HUMAN_INPUT_REQUIRED,
                        suggested_value=None,
                        display_value=None,
                        confidence=round(best_score, 3),
                        matched_profile_field=best_field,
                        requires_human=True,
                        human_action_type=HumanActionType.MISSING_PROFILE_DATA,
                        human_prompt_message_en=f"Missing Profile Detail: Please enter your {field.label}.",
                        human_prompt_message_hi=f"अधूरी जानकारी: कृपया अपना {field.label} दर्ज करें (प्रोफ़ाइल में अनुपलब्ध)।",
                        match_reason=f"Recognized as profile.{best_field} (cosine: {best_score:.2f}) but profile value is missing"
                    )
                )
                human_action_count += 1
            elif field.is_required:
                # Unmatched but mandatory field -> Prompt user
                mappings.append(
                    FieldMappingResult(
                        field_id=field.field_id,
                        action=FieldMappingAction.HUMAN_INPUT_REQUIRED,
                        suggested_value=None,
                        display_value=None,
                        confidence=round(max(0.0, best_score), 3),
                        matched_profile_field=None,
                        requires_human=True,
                        human_action_type=HumanActionType.AMBIGUOUS_DECISION,
                        human_prompt_message_en=f"Required Field: Please enter {field.label}.",
                        human_prompt_message_hi=f"आवश्यक फ़ील्ड: कृपया {field.label} दर्ज करें।",
                        match_reason="Mandatory portal field requiring manual entry"
                    )
                )
                human_action_count += 1
            else:
                mappings.append(
                    FieldMappingResult(
                        field_id=field.field_id,
                        action=FieldMappingAction.UNMATCHED,
                        suggested_value=None,
                        display_value=None,
                        confidence=round(max(0.0, best_score), 3),
                        matched_profile_field=None,
                        requires_human=False,
                        human_action_type=HumanActionType.NONE,
                        match_reason="Optional field with no high-confidence profile match"
                    )
                )
                unmatched_count += 1

        total_fields = len(request.fields)
        coverage = round(((auto_fill_count + human_action_count) / total_fields) * 100, 1) if total_fields > 0 else 0.0
        elapsed_ms = round((time.time() - start_time) * 1000, 2)

        return FormMatchingResponse(
            target_portal=request.target_portal or "generic",
            total_fields=total_fields,
            auto_fillable_fields=auto_fill_count,
            human_action_fields=human_action_count,
            unmatched_fields=unmatched_count,
            automation_coverage_pct=coverage,
            mappings=mappings,
            execution_time_ms=elapsed_ms,
            engine="FastEmbed_all-MiniLM-L6-v2"
        )


# Singleton accessor
_service_instance: Optional[FormMatcherService] = None

def get_form_matcher_service() -> FormMatcherService:
    global _service_instance
    if _service_instance is None:
        _service_instance = FormMatcherService()
    return _service_instance
