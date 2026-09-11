"""
API Endpoints Unit Test for Phase 1
Tests FastAPI routes using TestClient or ASGI transport.
"""
import sys
import os

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app

def test_endpoints():
    client = TestClient(app)

    print("1. Testing GET / ...")
    res_root = client.get("/")
    assert res_root.status_code == 200
    assert res_root.json()["status"] == "online"
    print("   [OK] Root endpoint returned 200 OK.")

    print("2. Testing GET /health ...")
    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "ok"
    print("   [OK] Liveness probe returned 200 OK.")

    print("3. Testing GET /api/v1/dev/health ...")
    res_dev = client.get("/api/v1/dev/health")
    assert res_dev.status_code == 200
    data = res_dev.json()
    assert "rss_mb" in data
    assert "ram_ceiling_mb" in data
    assert data["ram_ceiling_mb"] == 512.0
    print(f"   [OK] Dev HUD returned 200 OK with RSS: {data['rss_mb']} MB.")

    print("4. Testing POST /api/v1/dev/toggle ...")
    res_toggle = client.post("/api/v1/dev/toggle", json={"ocr_engine": "GEMINI", "matcher_engine": "MOCK"})
    assert res_toggle.status_code == 200
    toggle_data = res_toggle.json()
    assert toggle_data["ocr_engine"] == "GEMINI"
    assert toggle_data["matcher_engine"] == "MOCK"
    print("   [OK] Dev toggle successfully updated engine modes.")

    print("5. Testing POST /api/v1/dev/gc ...")
    res_gc = client.post("/api/v1/dev/gc")
    assert res_gc.status_code == 200
    assert res_gc.json()["status"] == "success"
    print("   [OK] GC endpoint successfully collected memory.")

    print("6. Testing POST /api/v1/ocr/extract-targeted (Mock mode)...")
    # Send a mock image file
    from io import BytesIO
    from PIL import Image
    buf = BytesIO()
    Image.new("RGB", (200, 200), color="white").save(buf, format="JPEG")
    buf.seek(0)

    res_ocr = client.post(
        "/api/v1/ocr/extract-targeted",
        data={"doc_type": "AADHAAR", "force_engine": "MOCK", "allow_gemini_fallback": "false"},
        files={"file": ("test.jpg", buf, "image/jpeg")}
    )
    assert res_ocr.status_code == 200
    ocr_data = res_ocr.json()
    assert ocr_data["doc_type"] == "AADHAAR"
    assert "masked_aadhaar" in ocr_data
    assert "XXXX-XXXX-" in ocr_data["masked_aadhaar"]
    print(f"   [OK] Targeted OCR returned 200 OK with masked Aadhaar: {ocr_data['masked_aadhaar']}.")

    print("7. Testing POST /api/v1/ocr/extract-targeted with allow_gemini_fallback=false...")
    buf.seek(0)
    res_ocr_auto = client.post(
        "/api/v1/ocr/extract-targeted",
        data={"doc_type": "AADHAAR", "force_engine": "AUTO", "allow_gemini_fallback": "false"},
        files={"file": ("blank.jpg", buf, "image/jpeg")}
    )
    assert res_ocr_auto.status_code == 200
    auto_data = res_ocr_auto.json()
    assert auto_data["needs_permission"] is True
    assert auto_data["can_use_gemini"] is True
    assert "prompt_message" in auto_data and auto_data["prompt_message"] is not None
    print(f"   [OK] Permission gate verified: returns needs_permission=True when fallback is not allowed.")

    print("8. Testing POST /api/v1/ocr/extract-targeted with allow_gemini_fallback=true...")
    buf.seek(0)
    res_ocr_gemini = client.post(
        "/api/v1/ocr/extract-targeted",
        data={"doc_type": "AADHAAR", "force_engine": "AUTO", "allow_gemini_fallback": "true"},
        files={"file": ("blank.jpg", buf, "image/jpeg")}
    )
    assert res_ocr_gemini.status_code == 200
    gemini_data = res_ocr_gemini.json()
    assert gemini_data["needs_permission"] is False
    assert "Gemini" in gemini_data["engine"]
    print(f"   [OK] Permission granted verified: invoked Gemini AI fallback successfully.")

    print("9. Testing POST /api/v1/kyc/verify-otp...")
    res_kyc = client.post(
        "/api/v1/kyc/verify-otp",
        json={"aadhaar_or_mobile": "9876543210", "otp": "123456"}
    )
    assert res_kyc.status_code == 200
    kyc_data = res_kyc.json()
    assert kyc_data["verified"] is True
    assert kyc_data["ref_id"] == "DL-2026-X8921"
    print(f"   [OK] DigiLocker eKYC returned 200 OK with ref_id: {kyc_data['ref_id']}.")

    print("\n>>> ALL API ROUTE TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    test_endpoints()
