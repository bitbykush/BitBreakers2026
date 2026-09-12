from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from app.models.schemas import (
    SchemeMatch,
    SchemeMatchRequest,
    SchemeMatchResponse,
    QuickMatchRequest,
    QuickMatchResponse,
    SchemeListResponse,
    SchemeComparisonResponse,
    SchemeFinancials
)
from app.services.matcher import get_scheme_matcher

router = APIRouter(prefix="/schemes", tags=["Welfare & Scholarship Schemes"])


def _to_scheme_match(s: dict) -> SchemeMatch:
    fin = s.get("financials", {})
    req_docs = s.get("requiredDocuments", [])
    return SchemeMatch(
        id=s["id"],
        code=s.get("code", s["id"].upper()),
        nameEn=s.get("nameEn", ""),
        nameHi=s.get("nameHi", ""),
        ministryEn=s.get("ministryEn", ""),
        ministryHi=s.get("ministryHi", ""),
        descriptionEn=s.get("descriptionEn", ""),
        descriptionHi=s.get("descriptionHi", ""),
        compatibilityPercentage=100.0,
        categoryBadge=s.get("categoryBadge", "STANDARD"),
        financials=SchemeFinancials(
            grantSubsidyPercentage=fin.get("grantSubsidyPercentage", 0),
            maxGrantAmount=fin.get("maxGrantAmount", 0),
            loanPercentage=fin.get("loanPercentage", 0),
            promoterMarginPercentage=fin.get("promoterMarginPercentage", 0),
            subsidizedInterestRate=fin.get("subsidizedInterestRate"),
            moratoriumPeriodMonths=fin.get("moratoriumPeriodMonths"),
            collateralRequired=fin.get("collateralRequired", False),
        ),
        requiredDocuments=req_docs,
        verifiedDocuments=[],
        missingDocuments=req_docs,
        eligibilityHighlights=s.get("eligibilityHighlights", []),
        nodalAgency=s.get("nodalAgency", "Government of India"),
        tags=s.get("tags"),
        benefits=s.get("benefits"),
        eligibilityCriteria=s.get("eligibilityCriteriaList"),
        applicationProcess=s.get("applicationProcess"),
        faqs=s.get("faqs"),
        sourcesAndReferences=s.get("sourcesAndReferences"),
    )


@router.get("", response_model=SchemeListResponse)
def list_schemes(
    category: Optional[str] = Query(None, description="Filter by category (SC, ST, OBC, EWS, General)"),
    search: Optional[str] = Query(None, description="Keyword search in scheme title or description"),
    limit: int = Query(50, ge=1, le=100, description="Max schemes to return")
):
    """
    Returns the comprehensive list of 28+ government welfare and scholarship schemes.
    Supports search query and category filtering.
    """
    matcher = get_scheme_matcher()
    raw_schemes = matcher.get_all_schemes()
    filtered = []

    for s in raw_schemes:
        # Category filter check
        if category:
            allowed = s.get("eligibilityCriteria", {}).get("allowedCategories", [])
            if allowed and category.upper() not in [c.upper() for c in allowed]:
                continue

        # Search keyword check
        if search:
            q = search.lower()
            corpus = f"{s.get('nameEn', '')} {s.get('nameHi', '')} {s.get('descriptionEn', '')}".lower()
            if q not in corpus:
                continue

        filtered.append(_to_scheme_match(s))

    return SchemeListResponse(
        total=len(filtered),
        schemes=filtered[:limit]
    )


@router.get("/compare", response_model=SchemeComparisonResponse)
def compare_schemes(
    scheme_a: str = Query(..., description="ID or code of first scheme"),
    scheme_b: str = Query(..., description="ID or code of second scheme")
):
    """
    Compares strictly two specific welfare or scholarship schemes side-by-side.
    Returns resolved SchemeMatch objects plus calculated comparative differentials.
    """
    matcher = get_scheme_matcher()
    raw_a = matcher.get_scheme_by_id(scheme_a)
    if not raw_a:
        raise HTTPException(status_code=404, detail=f"Scheme A with ID '{scheme_a}' not found.")
    raw_b = matcher.get_scheme_by_id(scheme_b)
    if not raw_b:
        raise HTTPException(status_code=404, detail=f"Scheme B with ID '{scheme_b}' not found.")

    match_a = _to_scheme_match(raw_a)
    match_b = _to_scheme_match(raw_b)

    fin_a = match_a.financials
    fin_b = match_b.financials

    grant_diff = fin_a.grantSubsidyPercentage - fin_b.grantSubsidyPercentage
    max_grant_diff = fin_a.maxGrantAmount - fin_b.maxGrantAmount
    loan_diff = fin_a.loanPercentage - fin_b.loanPercentage
    margin_diff = fin_a.promoterMarginPercentage - fin_b.promoterMarginPercentage

    docs_a = set(match_a.requiredDocuments)
    docs_b = set(match_b.requiredDocuments)

    summary = {
        "grantSubsidyDiffPercentage": grant_diff,
        "maxGrantAmountDiff": max_grant_diff,
        "loanPercentageDiff": loan_diff,
        "promoterMarginDiff": margin_diff,
        "commonDocuments": list(docs_a.intersection(docs_b)),
        "uniqueDocumentsA": list(docs_a - docs_b),
        "uniqueDocumentsB": list(docs_b - docs_a),
    }

    return SchemeComparisonResponse(
        schemeA=match_a,
        schemeB=match_b,
        comparisonSummary=summary
    )


@router.get("/match", response_model=SchemeMatchResponse)
def get_match_schemes(
    profession: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    annual_income_inr: Optional[float] = Query(120000.0),
    gender: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    education: Optional[str] = Query(None),
    required_capital_inr: Optional[float] = Query(100000.0),
):
    """
    GET probe/fallback for Pathway 2 Matcher Endpoint.
    Returns matched schemes using query parameters or defaults.
    """
    matcher = get_scheme_matcher()
    req = SchemeMatchRequest(
        profession=profession or "",
        category=category or "",
        annual_income_inr=annual_income_inr or 120000.0,
        gender=gender or "",
        area=area or "",
        education=education or "",
        required_capital_inr=required_capital_inr or 100000.0,
        uploaded_document_codes=[]
    )
    return matcher.match_schemes(req)


@router.post("/match", response_model=SchemeMatchResponse)
def match_schemes(request: SchemeMatchRequest):
    """
    Pathway 2 Full Assisted Matcher Endpoint:
    Combines hard boolean filters with FastEmbed semantic cosine scoring.
    Disqualifies ineligible candidates (Score = 0%) and calculates affirmative action bonuses.
    Dynamically omits verified documents from missing document lists.
    """
    matcher = get_scheme_matcher()
    return matcher.match_schemes(request)


@router.post("/quick-match", response_model=QuickMatchResponse)
def quick_match_schemes(request: QuickMatchRequest):
    """
    Pathway 1 Instant 1-Tap / Voice Preview Endpoint:
    Returns the top 3-4 recommended schemes in <50ms based on trade or voice intent.
    """
    matcher = get_scheme_matcher()
    return matcher.quick_match(request)


@router.get("/{scheme_id}", response_model=SchemeMatch)
def get_scheme_by_id(scheme_id: str):
    """
    Retrieves full details of a specific welfare or scholarship scheme by ID or code.
    Placed after static routes to avoid shadowing /match or /compare.
    """
    if scheme_id.lower() in ("match", "quick-match", "compare"):
        raise HTTPException(status_code=404, detail=f"Scheme with ID '{scheme_id}' not found.")

    matcher = get_scheme_matcher()
    s = matcher.get_scheme_by_id(scheme_id)
    if not s:
        raise HTTPException(status_code=404, detail=f"Scheme with ID '{scheme_id}' not found.")

    return _to_scheme_match(s)
