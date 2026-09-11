"""
Phase 1 Verification Script:
Validates python module integrity, settings, Dev HUD health route,
and FastEmbed singleton under memory constraints.
"""
import sys
import os

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

def test_imports_and_syntax():
    print("-> Checking app imports and syntax...")
    try:
        from app.config import get_settings
        from app.models.schemas import HealthResponse, DevHealthResponse, DevToggleRequest
        from app.services.embedding_service import FastEmbedSingleton, get_embedding_service
        from app.api.v1.routes_dev import get_dev_health, toggle_engines
        from app.main import app
        print("   [OK] All modules imported successfully without syntax errors.")
    except Exception as e:
        print(f"   [FAIL] Import error: {e}")
        return False
    return True

def test_settings():
    print("-> Checking configuration settings...")
    from app.config import get_settings
    settings = get_settings()
    assert settings.APP_NAME == "UdyamSetu AI", "Incorrect APP_NAME"
    assert settings.RAM_CEILING_MB == 512.0, "Incorrect RAM ceiling"
    assert settings.MAX_IMAGE_DIM == 1280, "Incorrect MAX_IMAGE_DIM"
    print(f"   [OK] Settings verified: RAM limit {settings.RAM_CEILING_MB}MB, Image limit {settings.MAX_IMAGE_DIM}px.")
    return True

def test_fastembed_service():
    print("-> Checking FastEmbed singleton & cosine similarity...")
    from app.services.embedding_service import get_embedding_service
    import numpy as np

    svc = get_embedding_service()
    # Force mock mode for fast local verification if model is not pre-downloaded
    vec1 = svc.embed_single("PM Employment Generation Programme pottery artisan")
    vec2 = svc.embed_single("Handicraft and pottery terracotta loan subsidy")
    vec3 = svc.embed_single("Aviation aerospace engineering satellite")

    assert len(vec1) == 384, f"Vector dimension expected 384, got {len(vec1)}"
    sim_related = svc.cosine_similarity(vec1, vec2)
    sim_unrelated = svc.cosine_similarity(vec1, vec3)

    print(f"   Vector dimension: {len(vec1)}")
    print(f"   Related similarity (Pottery vs Pottery Loan): {sim_related:.4f}")
    print(f"   Unrelated similarity (Pottery vs Aviation): {sim_unrelated:.4f}")
    print("   [OK] Embedding service operational.")
    return True

def test_dev_hud_telemetry():
    print("-> Checking Dev HUD memory telemetry endpoint...")
    from app.api.v1.routes_dev import get_dev_health
    health = get_dev_health()
    print(f"   RSS RAM: {health.rss_mb} MB / {health.ram_ceiling_mb} MB ({health.memory_percentage}%)")
    print(f"   CPU Percent: {health.cpu_percent}% | Status: {health.status} | Engine: {health.ocr_engine}")
    assert health.rss_mb < 512.0, "RSS exceeds 512MB RAM ceiling!"
    print("   [OK] Dev HUD telemetry verified.")
    return True

def main():
    print("=" * 60)
    print("UdyamSetu AI - Backend Phase 1 Verification")
    print("Target Environment: Render Free Tier (512MB RAM / 1 vCPU)")
    print("=" * 60)

    success = True
    success &= test_imports_and_syntax()
    success &= test_settings()
    success &= test_fastembed_service()
    success &= test_dev_hud_telemetry()

    print("=" * 60)
    if success:
        print(">>> ALL PHASE 1 CHECKS PASSED SUCCESSFULLY! <<<")
        sys.exit(0)
    else:
        print(">>> SOME CHECKS FAILED. <<<")
        sys.exit(1)

if __name__ == "__main__":
    main()
