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
