"""
Phase 2 Comprehensive Test Suite:
Welfare Schemes Ingestion, FastEmbed Hybrid Matcher,
Hard Boolean Filter, Affirmative Action, Dynamic Documents, and API Endpoints.
"""
import sys
import os
import time

# Guard for Windows terminal encoding
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app
from app.services.matcher import get_scheme_matcher
from app.models.schemas import SchemeMatchRequest, QuickMatchRequest


def test_scheme_dataset():
    print("1. Validating schemes.json dataset integrity...")
    matcher = get_scheme_matcher()
    schemes = matcher.get_all_schemes()
    assert len(schemes) >= 25, f"Expected at least 25 schemes, found {len(schemes)}"
    print(f"   [OK] Loaded {len(schemes)} real welfare schemes into memory.")

    for s in schemes:
        assert "id" in s and "code" in s, f"Scheme {s} missing id or code"
        assert "nameEn" in s and "nameHi" in s, f"Scheme {s['id']} missing bilingual names"
        assert "financials" in s, f"Scheme {s['id']} missing financials"
        assert "eligibilityCriteria" in s, f"Scheme {s['id']} missing eligibilityCriteria"
        assert "requiredDocuments" in s, f"Scheme {s['id']} missing requiredDocuments"
    print("   [OK] All scheme schemas and bilingual descriptors validated.")


def test_hard_boolean_disqualification():
    print("\n2. Testing Deterministic Hard Boolean Disqualification...")
    matcher = get_scheme_matcher()

    # Case A: Income exceeding scholarship ceiling (₹2.5 Lakh)
    rich_student = SchemeMatchRequest(
        profession="Student pursuing B.Tech Degree",
        category="SC",
        annual_income_inr=600000.0,  # Exceeds ₹2.5L ceiling
        gender="Male",
        area="Rural",
        education="12th",
        required_capital_inr=50000.0
    )
    pms_sc_scheme = matcher.get_scheme_by_id("post-matric-scholarship-sc")
    assert pms_sc_scheme is not None
    eligible, reason = matcher.evaluate_hard_filter(pms_sc_scheme, rich_student)
    assert eligible is False, "Candidate exceeding income ceiling should be disqualified!"
    print(f"   [OK] Income ceiling filter passed: Disqualified with reason: '{reason}'")

    # Case B: Male applicant applying for Women-only scheme
    male_applicant = SchemeMatchRequest(
        profession="Tailor and Garments",
        category="OBC",
        annual_income_inr=150000.0,
        gender="Male",  # Ineligible for New Swarnima for Women
        area="Rural",
        education="10th",
        required_capital_inr=100000.0
    )
    swarnima_scheme = matcher.get_scheme_by_id("new-swarnima-obc")
    assert swarnima_scheme is not None
    eligible, reason = matcher.evaluate_hard_filter(swarnima_scheme, male_applicant)
    assert eligible is False, "Male applicant should be disqualified from women-only scheme!"
    print(f"   [OK] Gender exclusivity filter passed: Disqualified with reason: '{reason}'")

    # Case C: General category applicant applying for SC-exclusive scheme
    gen_applicant = SchemeMatchRequest(
        profession="Tech startup founder",
        category="General",  # Ineligible for VCF_SC (exclusive for SC)
        annual_income_inr=200000.0,
        gender="Male",
        area="Urban",
        education="Graduate",
        required_capital_inr=3000000.0
    )
    vcf_sc_scheme = matcher.get_scheme_by_id("vcf-sc")
    assert vcf_sc_scheme is not None
    eligible, reason = matcher.evaluate_hard_filter(vcf_sc_scheme, gen_applicant)
    assert eligible is False, "General category applicant should be disqualified from SC-exclusive scheme!"
    print(f"   [OK] Social category filter passed: Disqualified with reason: '{reason}'")


def test_persona_matching_and_ranking():
    print("\n3. Testing Real Persona Matching & Ranking...")
    matcher = get_scheme_matcher()

    # Persona: Ramesh Kumar - Rural Terracotta Potter (OBC)
    ramesh_req = SchemeMatchRequest(
        profession="Terracotta potter and clay artisan",
        category="OBC",
        annual_income_inr=120000.0,
        gender="Male",
        area="Rural",
        education="Literate",
        required_capital_inr=200000.0,
        uploaded_document_codes=["DOC_AADHAAR", "DOC_CASTE"]
    )
    res = matcher.match_schemes(ramesh_req)
    assert len(res.matches) > 0, "Expected positive matches for artisan persona"

    top_codes = [m.code for m in res.matches[:3]]
    print(f"   Ramesh Kumar Top 3 Matches: {top_codes}")
    print(f"   Top Match: {res.matches[0].nameEn} ({res.matches[0].compatibilityPercentage}%)")

    # Verify PMEGP or PM Vishwakarma is in the top recommendations
    assert ("PMEGP" in top_codes or "PM_VISHWAKARMA" in top_codes), "Artisan must match PMEGP or Vishwakarma!"
    assert res.matches[0].compatibilityPercentage >= 85.0, "Top compatibility score must be >= 85%"
    print(f"   Execution time: {res.execution_time_ms} ms (Target: < 150ms)")
    assert res.execution_time_ms < 150.0, "Execution took longer than 150ms SLA!"
    print("   [OK] Persona ranking and performance SLA verified.")


def test_dynamic_document_resolution():
    print("\n4. Testing Dynamic Missing Document Resolution ('Don't Ask Twice')...")
    matcher = get_scheme_matcher()

    # Session already has Aadhaar and Caste uploaded
    req = SchemeMatchRequest(
        profession="Potter artisan",
        category="OBC",
        annual_income_inr=100000.0,
        gender="Male",
        area="Rural",
        education="Literate",
        required_capital_inr=150000.0,
        uploaded_document_codes=["DOC_AADHAAR", "DOC_CASTE"]
    )
    res = matcher.match_schemes(req)
    pmegp = next(m for m in res.matches if m.code == "PMEGP")

    print(f"   PMEGP Required Docs: {pmegp.requiredDocuments}")
    print(f"   PMEGP Verified Docs: {pmegp.verifiedDocuments}")
    print(f"   PMEGP Missing Docs:  {pmegp.missingDocuments}")

    assert "DOC_AADHAAR" in pmegp.verifiedDocuments
    assert "DOC_CASTE" in pmegp.verifiedDocuments
    assert "DOC_AADHAAR" not in pmegp.missingDocuments
    assert "DOC_CASTE" not in pmegp.missingDocuments
    assert "DOC_RURAL" in pmegp.missingDocuments
    print("   [OK] Dynamic document resolver correctly omits uploaded docs from missing checklist.")


def test_api_routes():
    print("\n5. Testing Schemes API Endpoints via HTTP TestClient...")
    client = TestClient(app)

    # 1. GET /api/v1/schemes
    res_list = client.get("/api/v1/schemes")
    assert res_list.status_code == 200
    data_list = res_list.json()
    assert data_list["total"] >= 25
    print(f"   [OK] GET /api/v1/schemes returned {data_list['total']} schemes.")

    # 2. GET /api/v1/schemes/{scheme_id}
    res_single = client.get("/api/v1/schemes/pm-vishwakarma")
    assert res_single.status_code == 200
    assert res_single.json()["code"] == "PM_VISHWAKARMA"
    print("   [OK] GET /api/v1/schemes/pm-vishwakarma returned scheme details.")

    # 3. POST /api/v1/schemes/match
    t0 = time.perf_counter()
    res_match = client.post(
        "/api/v1/schemes/match",
        json={
            "profession": "Street vendor tea and snack stall",
            "category": "OBC",
            "annual_income_inr": 80000.0,
            "gender": "Male",
            "area": "Urban",
            "education": "Literate",
            "required_capital_inr": 20000.0,
            "uploaded_document_codes": ["DOC_AADHAAR"]
        }
    )
    t1 = time.perf_counter()
    api_duration_ms = (t1 - t0) * 1000
    assert res_match.status_code == 200
    match_data = res_match.json()
    assert "matches" in match_data
    assert len(match_data["matches"]) > 0
    top_match = match_data["matches"][0]
    print(f"   Vendor Match: Top={top_match['code']} ({top_match['compatibilityPercentage']}%) in {api_duration_ms:.1f}ms")
    assert top_match["code"] in ["PM_SVANIDHI", "MUDRA_SHISHU"]
    print("   [OK] POST /api/v1/schemes/match matched street vendor accurately.")

    # 4. POST /api/v1/schemes/quick-match (Pathway 1)
    res_quick = client.post(
        "/api/v1/schemes/quick-match",
        json={
            "profession_query": "Farming dairy cows and milk production",
            "limit": 3
        }
    )
    assert res_quick.status_code == 200
    quick_data = res_quick.json()
    assert len(quick_data["matches"]) <= 3
    print(f"   [OK] POST /api/v1/schemes/quick-match returned top {len(quick_data['matches'])} matches in {quick_data['execution_time_ms']}ms.")


def main():
    print("=" * 65)
    print("UdyamSetu AI - Phase 2 Welfare Schemes & FastEmbed Matcher Test")
    print("Target Environment: Render Free Tier (512MB RAM / 1 vCPU)")
    print("=" * 65)

    test_scheme_dataset()
    test_hard_boolean_disqualification()
    test_persona_matching_and_ranking()
    test_dynamic_document_resolution()
    test_api_routes()

    print("\n" + "=" * 65)
    print(">>> ALL PHASE 2 VERIFICATIONS PASSED WITH 100% SUCCESS! <<<")
    print("=" * 65)


if __name__ == "__main__":
    main()
