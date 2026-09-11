from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from app.models.schemas import (
    SchemeMatch,
    SchemeMatchRequest,
    SchemeMatchResponse,
    QuickMatchRequest,
    QuickMatchResponse,
    SchemeListResponse,
    SchemeFinancials
)
from app.services.matcher import get_scheme_matcher

router = APIRouter(prefix="/schemes", tags=["Welfare & Scholarship Schemes"])


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

        fin = s.get("financials", {})
        req_docs = s.get("requiredDocuments", [])

        match_item = SchemeMatch(
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
        filtered.append(match_item)

    return SchemeListResponse(
        total=len(filtered),
        schemes=filtered[:limit]
    )


@router.get("/{scheme_id}", response_model=SchemeMatch)
def get_scheme_by_id(scheme_id: str):
    """
    Retrieves full details of a specific welfare or scholarship scheme by ID or code.
    """
    matcher = get_scheme_matcher()
    s = matcher.get_scheme_by_id(scheme_id)
    if not s:
        raise HTTPException(status_code=404, detail=f"Scheme with ID '{scheme_id}' not found.")

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
