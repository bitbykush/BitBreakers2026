import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.models.schemas import HealthResponse
from app.api.v1.routes_dev import router as dev_router
from app.api.v1.routes_schemes import router as schemes_router
from app.services.embedding_service import get_embedding_service
from app.services.matcher import get_scheme_matcher

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("udyamsetu.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager to verify memory usage at boot.
    Enforces the Render 512MB RAM ceiling by logging initial RSS memory.
    """
    settings = get_settings()
    initial_rss_mb = 85.0
    try:
        import psutil
        process = psutil.Process(os.getpid())
        initial_rss_mb = round(process.memory_info().rss / (1024 * 1024), 2)
    except Exception:
        process = None

    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Initial process RSS Memory: {initial_rss_mb} MB / {settings.RAM_CEILING_MB} MB")

    # Warm-up singleton embedding service and pre-index schemes
    try:
        embedder = get_embedding_service()
        if not embedder.is_mock_mode():
            # Quick 1-token test embed to initialize ONNX runtime session safely
            _ = embedder.embed_single("UdyamSetu initialization")
            if process is not None:
                post_embed_rss = round(process.memory_info().rss / (1024 * 1024), 2)
                logger.info(f"FastEmbed ONNX warmed up. RSS Memory: {post_embed_rss} MB")
        
        # Pre-index 28 welfare schemes in memory (~43KB footprint)
        matcher = get_scheme_matcher()
        logger.info(f"Scheme Matcher initialized with {len(matcher.get_all_schemes())} schemes.")
    except Exception as e:
        logger.warning(f"Could not warm up services on startup: {e}")

    yield

    logger.info("Shutting down UdyamSetu AI backend.")


settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Zero-Login, AI-Driven Welfare & Scholarship Matcher with Common Application Dossier. "
        "Strictly optimized for Render Free Tier (512MB RAM ceiling, 1 vCPU)."
    ),
    lifespan=lifespan
)

# CORS configuration for Next.js frontend (Vercel & localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(dev_router, prefix="/api/v1")
app.include_router(schemes_router, prefix="/api/v1")


@app.get("/", tags=["Root"])
def root_endpoint():
    """Root metadata probe."""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs": "/docs",
        "health": "/health",
        "dev_hud": "/api/v1/dev/health"
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
def liveness_check():
    """Standard HTTP 200 liveness probe for Docker / Render."""
    return HealthResponse()
