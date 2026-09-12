from functools import lru_cache
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application Settings strictly tailored for Render Free Tier (512MB RAM ceiling).
    """
    APP_NAME: str = "UdyamSetu AI"
    APP_VERSION: str = "1.0.0"
    ENV: str = "development"
    DEBUG: bool = False

    # Server Binding
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Security & CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://*.vercel.app",
        "*"
    ]

    # Model & AI Services
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # Strict Memory & Processing Guardrails (Render Free Tier 512MB)
    MAX_IMAGE_DIM: int = 960
    RAM_CEILING_MB: float = 512.0
    RAM_WARNING_THRESHOLD_MB: float = 380.0
    RAM_CRITICAL_THRESHOLD_MB: float = 440.0

    # Runtime Toggles for Dev HUD & Fallbacks
    MOCK_MODE: bool = False
    DEFAULT_OCR_ENGINE: str = "AUTO"  # AUTO | RAPIDOCR | GEMINI | MOCK
    DEFAULT_MATCHER_ENGINE: str = "FASTEMBED"  # FASTEMBED | MOCK

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["*"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
