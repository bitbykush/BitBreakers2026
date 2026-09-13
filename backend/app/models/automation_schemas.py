from enum import Enum
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


class HumanActionType(str, Enum):
    CAPTCHA = "CAPTCHA"
    MOBILE_OTP = "MOBILE_OTP"
    AADHAAR_OTP = "AADHAAR_OTP"
    AADHAAR_MANUAL_ENTRY = "AADHAAR_MANUAL_ENTRY"
    BIOMETRIC_RD = "BIOMETRIC_RD"
    BANK_MANDATE_AA = "BANK_MANDATE_AA"
    FILE_UPLOAD_CONFIRM = "FILE_UPLOAD_CONFIRM"
    AMBIGUOUS_DECISION = "AMBIGUOUS_DECISION"
    FINAL_DECLARATION = "FINAL_DECLARATION"
    LOGIN_CREDENTIALS = "LOGIN_CREDENTIALS"
    MISSING_PROFILE_DATA = "MISSING_PROFILE_DATA"
    NONE = "NONE"


class FieldMappingAction(str, Enum):
    AUTO_FILL = "AUTO_FILL"
    AUTO_SELECT = "AUTO_SELECT"
    AUTO_CHECK = "AUTO_CHECK"
    HUMAN_INPUT_REQUIRED = "HUMAN_INPUT_REQUIRED"
    UNMATCHED = "UNMATCHED"


class FormFieldOption(BaseModel):
    value: str
    label: str


class FormFieldDescriptor(BaseModel):
    field_id: str = Field(..., description="Unique DOM identifier or query selector for the field")
    name: Optional[str] = Field(None, description="HTML name attribute")
    label: str = Field(..., description="Associated label, placeholder, or aria-label text")
    placeholder: Optional[str] = None
    aria_label: Optional[str] = None
    tag_name: str = Field(default="input", description="input, select, textarea")
    input_type: Optional[str] = Field(default="text", description="text, number, date, radio, checkbox, file, password, email")
    options: Optional[List[FormFieldOption]] = Field(default=None, description="Select or radio options")
    is_required: bool = False
    is_otp: Optional[bool] = False
    is_aadhaar: Optional[bool] = False
    page_section: Optional[str] = None


class CitizenProfilePayload(BaseModel):
    name: str = Field(..., description="Applicant Full Name")
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    category: Optional[str] = None
    marital_status: Optional[str] = None
    is_differently_abled: Optional[bool] = False
    is_ex_serviceman: Optional[bool] = False
    annual_income: Optional[float] = None
    masked_aadhaar: Optional[str] = None
    pan_number: Optional[str] = None
    mobile_number: Optional[str] = None
    email: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    block: Optional[str] = None
    pincode: Optional[str] = None
    address: Optional[str] = None
    area_type: Optional[str] = None
    education: Optional[str] = None
    profession: Optional[str] = None
    trade_or_activity: Optional[str] = None
    required_capital: Optional[float] = None
    own_contribution: Optional[float] = None
    bank_account_no: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    caste_certificate_no: Optional[str] = None
    income_certificate_no: Optional[str] = None
    edp_trained: Optional[bool] = False
    sponsoring_agency: Optional[str] = "KVIC"
    unit_location: Optional[str] = None
    unit_address: Optional[str] = None
    unit_pincode: Optional[str] = None
    legal_type: Optional[str] = "Individual"


class FieldMappingResult(BaseModel):
    field_id: str
    action: FieldMappingAction
    suggested_value: Optional[Any] = None
    display_value: Optional[str] = None
    confidence: float = Field(..., ge=0.0, le=1.0)
    matched_profile_field: Optional[str] = None
    requires_human: bool = False
    human_action_type: HumanActionType = HumanActionType.NONE
    human_prompt_message_en: Optional[str] = None
    human_prompt_message_hi: Optional[str] = None
    match_reason: Optional[str] = None


class FormMatchingRequest(BaseModel):
    target_portal: Optional[str] = "generic"
    fields: List[FormFieldDescriptor]
    profile: CitizenProfilePayload


class FormMatchingResponse(BaseModel):
    target_portal: str
    total_fields: int
    auto_fillable_fields: int
    human_action_fields: int
    unmatched_fields: int
    automation_coverage_pct: float
    mappings: List[FieldMappingResult]
    execution_time_ms: float
    engine: str = "FastEmbed_all-MiniLM-L6-v2"
