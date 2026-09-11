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

    print("\n>>> ALL API ROUTE TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    test_endpoints()
