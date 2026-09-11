"""
Test Search Queries against Backend Matcher
"""
import sys
import os

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

client = TestClient(app)

queries = [
    ("Solar energy research", "NSSFP"),
    ("Terracotta potter artisan", "PM_VISHWAKARMA"),
    ("Tailoring and boutique sewing", "MAHILA_SAMRIDHI"),
    ("Street vendor fruit stall", "PM_SVANIDHI"),
    ("Dairy farming and milk", "NLM"),
    ("College student degree", "PMS_OBC_SC"),
    ("Fish farming pond aquaculture", "PMMSY"),
    ("Food processing pickle masala", "PMFME"),
]

print("=" * 65)
print("TESTING BACKEND SEARCH MATCHES FOR KEY SEARCH QUERIES")
print("=" * 65)

for query, expected_code in queries:
    res = client.post("/api/v1/schemes/match", json={
        "profession": query,
        "category": "OBC",
        "annual_income_inr": 120000.0,
        "gender": "Female",
        "area": "Rural",
        "education": "Graduate",
        "required_capital_inr": 100000.0,
        "uploaded_document_codes": ["DOC_AADHAAR"]
    })
    assert res.status_code == 200
    matches = res.json()["matches"]
    top_codes = [m["code"] for m in matches[:3]]
    top_match = matches[0]
    status = "[PASS]" if expected_code in top_codes else "[WARN]"
    print(f"{status} Query: '{query}'")
    print(f"       Top 1: {top_match['code']} - {top_match['nameEn']} ({top_match['compatibilityPercentage']}%)")
    print(f"       Top 3: {top_codes}")

print("=" * 65)
print("Search feature backend verification completed!")
