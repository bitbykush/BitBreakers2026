import os
import re
import json
import time
import logging
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from app.config import get_settings
from app.models.schemas import (
    SchemeFinancials,
    SchemeMatch,
    SchemeMatchRequest,
    SchemeMatchResponse,
    QuickMatchRequest,
    QuickMatchResponse,
)
from app.services.embedding_service import get_embedding_service

logger = logging.getLogger("udyamsetu.matcher")

# Educational hierarchy ranks for qualification filtering
EDUCATION_RANKS = {
    "literate": 0,
    "8th": 1,
    "10th": 2,
    "12th": 3,
    "iti": 3,
    "diploma": 3,
    "graduate": 4,
    "postgraduate": 5
}

# Stop words ignored during search query trade extraction
QUERY_STOP_WORDS = {
    "in", "for", "and", "the", "a", "an", "to", "of", "with", "is", "at", "by", "from",
    "need", "want", "loan", "grant", "subsidy", "scheme", "business", "work", "project",
    "finance", "money", "rupees", "inr", "lakh", "crore", "govt", "government",
    "काम", "के", "लिए", "चाहिए", "लोन", "ऋण", "योजना", "सरकारी", "मुझे", "का", "की",
    "में", "से", "पर", "है", "हुनर", "व्यापार", "दुकानदार", "हेतु", "सहायता", "अनुदान",
    "स्वरोजगार", "उद्योग"
}

# Comprehensive bidirectional synonym clusters covering Indian trades and vernacular terms
_SYNONYM_CLUSTERS = [
    {"potter", "pottery", "terracotta", "clay", "pot", "pots", "artisan", "कुम्हार", "माटी", "बर्तन", "मिट्टी"},
    {"tailor", "tailoring", "garment", "garments", "handloom", "sewing", "boutique", "textile", "clothes", "सिलाई", "दर्जी", "कपड़े"},
    {"vendor", "street vendor", "thela", "cart", "stall", "fruit stall", "vegetable", "shop", "shopkeeper", "store", "रेहड़ी", "पटरी", "ठेला", "दुकान", "सब्जी", "फल", "ठेले"},
    {"dairy", "milk", "cow", "buffalo", "cattle", "livestock", "animal husbandry", "डेयरी", "दूध", "पशुपालन", "गाय", "भैंस"},
    {"solar", "solar panel", "renewable", "energy", "photovoltaic", "scientist", "research", "sun", "rooftop", "सोलर", "सौर", "छत"},
    {"carpenter", "carpentry", "wood", "furniture", "woodwork", "बढ़ई", "काष्ठकला", "लकड़ी", "फर्नीचर"},
    {"blacksmith", "lohar", "iron", "metal", "welder", "welding", "लोहार", "धातु", "लोहा"},
    {"weaver", "weaving", "bamboo", "basket", "handloom", "carpet", "बुनकर", "बांस", "टोकरी"},
    {"cobbler", "leather", "footwear", "shoes", "shoe", "मोची", "चर्मकार", "जूता", "चप्पल"},
    {"barber", "salon", "hair", "beauty parlour", "beauty", "नाई", "सैलून", "ब्यूटी", "बाल"},
    {"student", "scholarship", "college", "school", "degree", "education", "study", "fee", "fees", "छात्र", "छात्रवृत्ति", "पढ़ाई", "शिक्षा"},
    {"fisheries", "fish", "aquaculture", "pond", "fisherman", "मछली", "मत्स्य", "मछुआरा", "तालाब"},
    {"farmer", "farming", "agriculture", "kisan", "crop", "tractor", "खेती", "किसान", "कृषि", "फसल"},
    {"food", "catering", "dhaba", "restaurant", "canteen", "processing", "pickle", "masala", "bakery", "sweets", "खान-पान", "ढाबा", "अचार", "मसाला", "मिठाई", "बेकरी"},
    {"mechanic", "repair", "garage", "vehicle", "automobile", "ev", "motor", "bike", "car", "मैकेनिक", "मरम्मत", "गैराज"}
]

TRADE_SYNONYMS: Dict[str, List[str]] = {}
for cluster in _SYNONYM_CLUSTERS:
    for word in cluster:
        w_lower = word.lower()
        TRADE_SYNONYMS[w_lower] = [other.lower() for other in cluster if other != word]

# Flagship universal MSME credit schemes applicable to any non-farm enterprise / self-employment
UNIVERSAL_SCHEME_CODES = {"PMEGP", "MUDRA_SHISHU", "MUDRA_KISHORE", "MUDRA_TARUN", "CGTMSE"}


def check_trade_relevance(scheme: Dict[str, Any], query: str, semantic_sim: float, is_mock_mode: bool) -> Tuple[bool, float, int]:
    """
    Evaluates whether a scheme is meaningfully relevant to a user's trade/profession query.
    Returns: (is_relevant, match_ratio, matched_token_count)
    """
    if not query or not query.strip():
        # Empty query means general browsing, all eligible schemes pass
        return True, 1.0, 0

    clean_query = query.strip().lower()
    # Extract query tokens (ignoring stop words)
    raw_tokens = re.findall(r'[\w\u0900-\u097F]+', clean_query)
    tokens = [t for t in raw_tokens if t not in QUERY_STOP_WORDS and len(t) >= 2]
    if not tokens:
        tokens = [t for t in raw_tokens if len(t) >= 2]
    if not tokens:
        return False, 0.0, 0

    # Expand tokens with bidirectional synonyms
    expanded_tokens = set(tokens)
    for t in tokens:
        if t in TRADE_SYNONYMS:
            expanded_tokens.update(TRADE_SYNONYMS[t])

    # Construct scheme corpus
    crit = scheme.get("eligibilityCriteria", {})
    target_kw = crit.get("targetKeywords", "").lower()
    name_en = scheme.get("nameEn", "").lower()
    name_hi = scheme.get("nameHi", "").lower()
    desc_en = scheme.get("descriptionEn", "").lower()
    desc_hi = scheme.get("descriptionHi", "").lower()
    tags = " ".join(scheme.get("tags", [])).lower()
    highlights = " ".join(scheme.get("eligibilityHighlights", [])).lower()
    benefits = " ".join(scheme.get("benefits", [])).lower()
    badge = scheme.get("categoryBadge", "").lower()
    code = scheme.get("code", "").upper()

    scheme_corpus = f"{target_kw} {name_en} {name_hi} {tags} {badge} {desc_en} {desc_hi} {highlights} {benefits}"

    # Match tokens against scheme corpus (including substring matches for stems)
    matched_tokens = {tok for tok in expanded_tokens if tok in scheme_corpus or any(tok in word for word in scheme_corpus.split())}

    direct_matched_original = [t for t in tokens if t in matched_tokens or any(s in matched_tokens for s in TRADE_SYNONYMS.get(t, []))]
    match_ratio = len(direct_matched_original) / max(1, len(tokens))

    # Universal credit schemes (PMEGP, Mudra) apply to any non-scholarship self-employment activity
    is_scholarship_query = any(tok in {"student", "scholarship", "college", "school", "degree", "education", "study", "छात्र", "छात्रवृत्ति", "पढ़ाई"} for tok in tokens)
    is_universal_match = (code in UNIVERSAL_SCHEME_CODES) and (not is_scholarship_query)

    # Real semantic similarity threshold check (only if not in synthetic mock mode)
    semantic_pass = (not is_mock_mode) and (semantic_sim >= 0.35)

    # Relevant only if original token/synonym matched, or universal credit scheme, or high semantic similarity
    is_relevant = (len(direct_matched_original) > 0) or is_universal_match or semantic_pass
    effective_ratio = max(match_ratio, 0.7 if is_universal_match else 0.0)

    return is_relevant, effective_ratio, len(direct_matched_original)


class SchemeMatcher:
    """
    Hybrid Scheme Matcher combining:
    1. Deterministic Hard Boolean Eligibility Filter
    2. FastEmbed INT8 ONNX Cosine Semantic Similarity
    3. Affirmative Action & Financial Scale Weighting
    4. Dynamic Missing Document Resolver
    """
    _instance = None
    _schemes: List[Dict[str, Any]] = []
    _scheme_vectors: Dict[str, np.ndarray] = {}
    _is_initialized: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SchemeMatcher, cls).__new__(cls)
            cls._instance._load_and_index_schemes()
        return cls._instance

    def _load_and_index_schemes(self):
        """Loads schemes.json and computes/caches semantic vectors in memory (~43KB)."""
        data_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "schemes.json")
        try:
            with open(data_path, "r", encoding="utf-8") as f:
                self._schemes = json.load(f)
            logger.info(f"Loaded {len(self._schemes)} welfare schemes from {data_path}")

            # Pre-compute semantic vectors
            embedder = get_embedding_service()
            texts_to_embed = []
            scheme_ids = []

            for s in self._schemes:
                crit = s.get("eligibilityCriteria", {})
                # Rich text representation capturing name, description, and target trades
                rep = (
                    f"{s.get('nameEn', '')} {s.get('descriptionEn', '')} "
                    f"{crit.get('targetKeywords', '')} {s.get('categoryBadge', '')}"
                )
                texts_to_embed.append(rep)
                scheme_ids.append(s["id"])

            vectors = embedder.embed(texts_to_embed)
            for sid, vec in zip(scheme_ids, vectors):
                self._scheme_vectors[sid] = vec

            self._is_initialized = True
            logger.info(f"Pre-computed and cached {len(self._scheme_vectors)} scheme embeddings.")
        except Exception as e:
            logger.error(f"Failed to load or index schemes ({e})")
            self._schemes = []
            self._scheme_vectors = {}

    def get_all_schemes(self) -> List[Dict[str, Any]]:
        return self._schemes

    def get_scheme_by_id(self, scheme_id: str) -> Optional[Dict[str, Any]]:
        sid_norm = scheme_id.strip().lower()
        for s in self._schemes:
            if s["id"].lower() == sid_norm or s.get("code", "").lower() == sid_norm:
                return s
        return None

    def evaluate_hard_filter(self, scheme: Dict[str, Any], profile: SchemeMatchRequest) -> Tuple[bool, Optional[str]]:
        """
        Deterministic Hard Boolean Filter:
        Disqualifies applicants failing non-negotiable statutory eligibility boundaries.
        Returns: (is_eligible, disqualification_reason)
        """
        crit = scheme.get("eligibilityCriteria", {})

        # 1. Income Ceiling Check
        max_income = crit.get("maxIncome")
        if max_income is not None and profile.annual_income_inr > max_income:
            return False, f"Annual income (₹{profile.annual_income_inr:,.0f}) exceeds ceiling of ₹{max_income:,.0f}"

        # 2. Social Category Restriction Check (only if specified)
        allowed_cats = crit.get("allowedCategories")
        if allowed_cats and profile.category and profile.category.strip():
            norm_profile_cat = profile.category.strip().upper()
            allowed_upper = [c.upper() for c in allowed_cats]
            
            # Map compound/alias categories:
            # OBC-NCL satisfies OBC requirements
            # SCT satisfies SC or ST requirements
            candidate_cats = [norm_profile_cat]
            if norm_profile_cat in ["OBC-NCL", "OBC_NCL"]:
                candidate_cats.extend(["OBC", "SEBC"])
            elif norm_profile_cat in ["SCT", "SC/ST", "SC_ST"]:
                candidate_cats.extend(["SC", "ST"])
            elif norm_profile_cat == "OBC":
                candidate_cats.append("OBC-NCL")

            if not any(c in allowed_upper for c in candidate_cats):
                return False, f"Category '{profile.category}' not eligible (requires {', '.join(allowed_cats)})"

        # 3. Gender Exclusivity Check (only if specified)
        allowed_genders = crit.get("allowedGenders")
        if allowed_genders and profile.gender and profile.gender.strip():
            norm_profile_gender = profile.gender.strip().capitalize()
            allowed_genders_cap = [g.capitalize() for g in allowed_genders]
            if norm_profile_gender not in allowed_genders_cap:
                return False, f"Scheme exclusively available for {', '.join(allowed_genders)}"

        # 4. Area Restriction Check (only if specified)
        allowed_areas = crit.get("allowedAreas")
        if allowed_areas and profile.area and profile.area.strip():
            norm_profile_area = profile.area.strip().capitalize()
            allowed_areas_cap = [a.capitalize() for a in allowed_areas]
            if norm_profile_area not in allowed_areas_cap:
                return False, f"Scheme restricted to {', '.join(allowed_areas)} areas"

        # 5. Minimum Education Qualification Check (only if specified)
        min_edu = crit.get("minEducation")
        if min_edu and profile.education and profile.education.strip() not in ["", "N/A"]:
            # PMEGP exemption: 8th pass is only statutory for projects > 5 Lakh
            is_pmegp_micro = (scheme.get("code") == "PMEGP" and profile.required_capital_inr <= 500000)
            if not is_pmegp_micro:
                profile_edu_rank = EDUCATION_RANKS.get(profile.education.strip().lower(), 1)
                min_edu_rank = EDUCATION_RANKS.get(min_edu.strip().lower(), 0)
                if profile_edu_rank < min_edu_rank:
                    return False, f"Requires minimum education of {min_edu}"

        return True, None

    def compute_compatibility_score(
        self,
        scheme: Dict[str, Any],
        profile: SchemeMatchRequest,
        semantic_sim: float,
        is_mock_mode: bool = False
    ) -> float:
        """
        Computes composite compatibility score (0 - 100%):
        If profession is specified, checks strict trade relevance first.
        If not trade relevant, returns 0.0 to prevent listing schemes for random queries.
        """
        prof = profile.profession.strip() if profile.profession else ""
        if prof:
            is_relevant, match_ratio, _ = check_trade_relevance(
                scheme, prof, semantic_sim, is_mock_mode
            )
            if not is_relevant:
                return 0.0

            # Effective similarity blends semantic cosine and direct trade match ratio
            effective_sim = max(semantic_sim if not is_mock_mode else 0.0, match_ratio * 0.9)
            clamped_sim = max(0.0, min(1.0, (effective_sim + 1.0) / 2.0))
            semantic_score = clamped_sim * 40.0
            keyword_score = match_ratio * 18.0
        else:
            # Generic browsing without a specific profession query
            semantic_score = 30.0
            keyword_score = 12.0

        crit = scheme.get("eligibilityCriteria", {})

        # Capital Fit component (15% weight)
        capital_score = 10.0
        min_cap = crit.get("minCapital", 0)
        max_cap = crit.get("maxCapital", 10000000)
        req_cap = profile.required_capital_inr

        if min_cap <= req_cap <= max_cap:
            capital_score = 15.0
        elif req_cap < min_cap:
            capital_score = max(5.0, 15.0 - ((min_cap - req_cap) / max(1, min_cap)) * 10.0)
        else:
            capital_score = max(5.0, 15.0 - ((req_cap - max_cap) / max(1, max_cap)) * 10.0)

        # Base Eligible Baseline (18% weight)
        baseline_score = 18.0

        # Affirmative Action Boost (Up to 12% bonus)
        affirmative_boost = 0.0
        if profile.gender.strip().capitalize() == "Female":
            affirmative_boost += 4.5
        if profile.category.strip().upper() in ["SC", "ST"]:
            affirmative_boost += 5.0
        elif profile.category.strip().upper() in ["OBC", "EWS"]:
            affirmative_boost += 2.5
        if profile.area.strip().capitalize() == "Rural":
            affirmative_boost += 3.0

        total_score = semantic_score + keyword_score + capital_score + baseline_score + affirmative_boost

        return round(min(98.5, max(60.0, total_score)), 1)

    def resolve_documents(
        self,
        required_docs: List[str],
        uploaded_codes: List[str]
    ) -> Tuple[List[str], List[str]]:
        """
        Dynamic Document Resolver:
        Checks session uploaded document codes against scheme requirements.
        """
        uploaded_set = set(uploaded_codes)
        verified = [doc for doc in required_docs if doc in uploaded_set]
        missing = [doc for doc in required_docs if doc not in uploaded_set]
        return verified, missing

    def match_schemes(self, request: SchemeMatchRequest) -> SchemeMatchResponse:
        """
        Executes full two-stage hybrid matching.
        Guaranteed sub-150ms execution via pre-indexed ONNX embeddings.
        """
        start_time = time.perf_counter()
        embedder = get_embedding_service()

        # Embed query text (only the actual profession text if provided)
        query_text = request.profession.strip() if request.profession and request.profession.strip() else "Government Welfare Scheme"
        query_vector = embedder.embed_single(query_text)

        matches: List[SchemeMatch] = []

        for s in self._schemes:
            sid = s["id"]
            scheme_vec = self._scheme_vectors.get(sid)

            # 1. Hard Boolean Filter
            is_eligible, reason = self.evaluate_hard_filter(s, request)

            # 2. Dynamic Document Resolution
            req_docs = s.get("requiredDocuments", [])
            verified_docs, missing_docs = self.resolve_documents(req_docs, request.uploaded_document_codes)

            # 3. Score Calculation
            if not is_eligible or scheme_vec is None:
                score = 0.0
            else:
                sim = embedder.cosine_similarity(query_vector, scheme_vec)
                score = self.compute_compatibility_score(s, request, sim, embedder.is_mock_mode())

            # If score > 0, include in ranked results
            if score > 0.0:
                fin = s.get("financials", {})
                match_item = SchemeMatch(
                    id=s["id"],
                    code=s.get("code", s["id"].upper()),
                    nameEn=s.get("nameEn", ""),
                    nameHi=s.get("nameHi", ""),
                    ministryEn=s.get("ministryEn", ""),
                    ministryHi=s.get("ministryHi", ""),
                    descriptionEn=s.get("descriptionEn", ""),
                    descriptionHi=s.get("descriptionHi", ""),
                    compatibilityPercentage=score,
                    categoryBadge=s.get("categoryBadge", "ELIGIBLE"),
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
                    verifiedDocuments=verified_docs,
                    missingDocuments=missing_docs,
                    eligibilityHighlights=s.get("eligibilityHighlights", []),
                    nodalAgency=s.get("nodalAgency", "Government of India"),
                    tags=s.get("tags"),
                    benefits=s.get("benefits"),
                    eligibilityCriteria=s.get("eligibilityCriteriaList"),
                    applicationProcess=s.get("applicationProcess"),
                    faqs=s.get("faqs"),
                    sourcesAndReferences=s.get("sourcesAndReferences"),
                )
                matches.append(match_item)

        # Sort descending by compatibility percentage
        matches.sort(key=lambda x: x.compatibilityPercentage, reverse=True)

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        matcher_mode = "MOCK" if embedder.is_mock_mode() else "FASTEMBED_ONNX"

        return SchemeMatchResponse(
            matches=matches,
            total_evaluated=len(self._schemes),
            execution_time_ms=elapsed_ms,
            matcher_engine=matcher_mode
        )

    def quick_match(self, request: QuickMatchRequest) -> QuickMatchResponse:
        """
        Ultra-fast Pathway 1 preview endpoint.
        Returns top 3-4 schemes based on profession or voice query in <50ms.
        """
        start_time = time.perf_counter()
        embedder = get_embedding_service()
        query_vec = embedder.embed_single(request.profession_query)

        scored_schemes = []
        for s in self._schemes:
            sid = s["id"]
            svec = self._scheme_vectors.get(sid)
            sim = embedder.cosine_similarity(query_vec, svec) if svec is not None else 0.0

            is_rel, match_ratio, _ = check_trade_relevance(
                s, request.profession_query, sim, embedder.is_mock_mode()
            )
            if not is_rel:
                continue

            if embedder.is_mock_mode():
                composite = match_ratio
            else:
                composite = max(0.0, (sim + 1.0) / 2.0) * 0.7 + (match_ratio * 0.3)

            req_docs = s.get("requiredDocuments", [])
            verified, missing = self.resolve_documents(req_docs, request.uploaded_document_codes)

            fin = s.get("financials", {})
            score = round(min(96.0, max(65.0, composite * 100)), 1)

            item = SchemeMatch(
                id=s["id"],
                code=s.get("code", s["id"].upper()),
                nameEn=s.get("nameEn", ""),
                nameHi=s.get("nameHi", ""),
                ministryEn=s.get("ministryEn", ""),
                ministryHi=s.get("ministryHi", ""),
                descriptionEn=s.get("descriptionEn", ""),
                descriptionHi=s.get("descriptionHi", ""),
                compatibilityPercentage=score,
                categoryBadge=s.get("categoryBadge", "PREVIEW MATCH"),
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
                verifiedDocuments=verified,
                missingDocuments=missing,
                eligibilityHighlights=s.get("eligibilityHighlights", []),
                nodalAgency=s.get("nodalAgency", "Government of India"),
                tags=s.get("tags"),
                benefits=s.get("benefits"),
                eligibilityCriteria=s.get("eligibilityCriteriaList"),
                applicationProcess=s.get("applicationProcess"),
                faqs=s.get("faqs"),
                sourcesAndReferences=s.get("sourcesAndReferences"),
            )
            scored_schemes.append(item)

        scored_schemes.sort(key=lambda x: x.compatibilityPercentage, reverse=True)
        top_matches = scored_schemes[:request.limit]

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return QuickMatchResponse(
            matches=top_matches,
            execution_time_ms=elapsed_ms
        )


def get_scheme_matcher() -> SchemeMatcher:
    return SchemeMatcher()
