from datetime import datetime
from typing import Optional, List, Literal, Dict, Any
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Health & Dev HUD Schemas
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    """Standard health check response."""
    status: str = "ok"
    service: str = "udyamsetu-backend"
    version: str = "1.0.0"
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class DevHealthResponse(BaseModel):
    """
    Detailed Dev HUD Server telemetry.
    Matches frontend DevDebugDrawer expectations for live memory monitoring.
    """
    rss_mb: float = Field(..., description="Current process Resident Set Size (RSS) in Megabytes")
    rss_bytes: int = Field(..., description="Current process RSS in bytes")
    ram_ceiling_mb: float = Field(default=512.0, description="Server RAM hard limit")
    memory_percentage: float = Field(..., description="Percentage of 512MB RAM consumed")
    cpu_percent: float = Field(..., description="Current process CPU percentage")
    uptime_seconds: float = Field(..., description="Server uptime in seconds")
    ocr_engine: str = Field(default="AUTO", description="Active OCR engine mode")
    matcher_engine: str = Field(default="FASTEMBED", description="Active Matcher engine mode")
    status: str = Field(default="healthy", description="System health status: healthy | warning | critical")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class DevToggleRequest(BaseModel):
    """Payload to toggle engine modes from Dev HUD."""
    ocr_engine: Optional[Literal["AUTO", "RAPIDOCR", "GEMINI", "MOCK"]] = None
    matcher_engine: Optional[Literal["FASTEMBED", "MOCK"]] = None


class DevToggleResponse(BaseModel):
    """Response confirming engine mode state."""
    ocr_engine: str
    matcher_engine: str
    message: str


# ---------------------------------------------------------------------------
# Scheme & Matcher Models (Aligned with frontend types/index.ts)
# ---------------------------------------------------------------------------

class SchemeFinancials(BaseModel):
    grantSubsidyPercentage: float
    maxGrantAmount: float
    loanPercentage: float
    promoterMarginPercentage: float
    subsidizedInterestRate: Optional[float] = None
    moratoriumPeriodMonths: Optional[int] = None
    collateralRequired: bool = False


class SchemeFAQ(BaseModel):
    question: str
    answer: str


class SchemeSource(BaseModel):
    title: str
    url: Optional[str] = None


class SchemeMatch(BaseModel):
    id: str
    code: str
    nameEn: str
    nameHi: str
    ministryEn: str
    ministryHi: str
    descriptionEn: str
    descriptionHi: str
    compatibilityPercentage: float
    categoryBadge: str
    financials: SchemeFinancials
    requiredDocuments: List[str]
    verifiedDocuments: List[str]
    missingDocuments: List[str]
    eligibilityHighlights: List[str]
    nodalAgency: str
    tags: Optional[List[str]] = None
    benefits: Optional[List[str]] = None
    eligibilityCriteria: Optional[List[str]] = None
    applicationProcess: Optional[List[str]] = None
    faqs: Optional[List[SchemeFAQ]] = None
    sourcesAndReferences: Optional[List[SchemeSource]] = None


class SchemeMatchRequest(BaseModel):
    """
    Candidate application payload sent from Pathway 2 / Apply wizard.
    Matches frontend ApiService.matchSchemes POST payload.
    """
    profession: str = Field(..., description="Applicant trade or business activity (e.g. Terracotta Potter, Tailor)")
    category: str = Field(default="General", description="Social Category: SC | ST | OBC | EWS | Minority | General")
    annual_income_inr: float = Field(default=0.0, description="Annual household income in Rupees")
    gender: str = Field(default="Male", description="Gender: Male | Female | Other")
    area: str = Field(default="Rural", description="Area type: Rural | Urban")
    education: str = Field(default="10th", description="Education: Literate | 8th | 10th | 12th | ITI | Graduate | PostGraduate")
    required_capital_inr: float = Field(default=100000.0, description="Capital or loan required in Rupees")
    uploaded_document_codes: List[str] = Field(default=[], description="List of document codes verified in session")


class SchemeMatchResponse(BaseModel):
    """Ranked scheme match response."""
    matches: List[SchemeMatch]
    total_evaluated: int
    execution_time_ms: float
    matcher_engine: str


class QuickMatchRequest(BaseModel):
    """Lightweight 1-tap/voice query for Pathway 1."""
    profession_query: str
    limit: int = 4
    uploaded_document_codes: List[str] = []


class QuickMatchResponse(BaseModel):
    matches: List[SchemeMatch]
    execution_time_ms: float


class SchemeListResponse(BaseModel):
    total: int
    schemes: List[SchemeMatch]


class SchemeComparisonResponse(BaseModel):
    schemeA: SchemeMatch
    schemeB: SchemeMatch
    comparisonSummary: Dict[str, Any] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# OCR & KYC Schemas
# ---------------------------------------------------------------------------

class OcrExtractedResponse(BaseModel):
    doc_type: str = Field(..., description="Document type: AADHAAR | CASTE | INCOME | MARKSHEET")
    name: Optional[str] = Field(None, description="Applicant Full Name extracted from document")
    dob: Optional[str] = Field(None, description="Date of birth in DD/MM/YYYY format")
    gender: Optional[str] = Field(None, description="Gender: MALE | FEMALE | TRANSGENDER")
    masked_aadhaar: Optional[str] = Field(None, description="UIDAI Masked Aadhaar: XXXX-XXXX-1234")
    pincode: Optional[str] = Field(None, description="6-digit postal pincode")
    address: Optional[str] = Field(None, description="Residential address extracted from back of Aadhaar")
    state: Optional[str] = Field(None, description="State extracted from back of Aadhaar")
    district: Optional[str] = Field(None, description="District extracted from back of Aadhaar")
    category: Optional[str] = Field(None, description="Caste / Social category: SC | ST | OBC | EWS | GENERAL")
    annual_income: Optional[float] = Field(None, description="Annual income in INR")
    financial_year: Optional[str] = Field(None, description="Financial assessment year (e.g. 2024-2025)")
    certificate_number: Optional[str] = Field(None, description="Official certificate reference / serial number")
    marks_percentage: Optional[float] = Field(None, description="Academic marks percentage")
    highest_education: Optional[str] = Field(None, description="Qualification: 10TH_PASS | 12TH_PASS | GRADUATE | DIPLOMA")
    confidence: float = Field(0.0, description="OCR confidence percentage (0-100)")
    engine: str = Field("RapidOCR_ONNX", description="OCR engine used: RapidOCR_ONNX | Gemini_1.5_Flash | Mock")
    needs_permission: bool = Field(False, description="True if local OCR confidence was low and requires user permission before calling Gemini")
    prompt_message: Optional[str] = Field(None, description="Permission prompt text to display to the user")
    can_use_gemini: bool = Field(False, description="Whether Gemini cloud AI fallback is available upon user approval")


class DigiLockerVerifyRequest(BaseModel):
    aadhaar_or_mobile: str = Field(..., description="Aadhaar number or Mobile number")
    otp: str = Field(..., description="6-digit sandbox OTP (demo: 123456)")


class DigiLockerVerifyResponse(BaseModel):
    verified: bool = True
    ref_id: str = Field("DL-2026-X8921", description="DigiLocker certificate verification ID")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    verified_documents: List[str] = Field(default=["DOC_AADHAAR", "DOC_CASTE", "DOC_INCOME"])
    aadhaar_or_mobile: str

