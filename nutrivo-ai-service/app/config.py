from pathlib import Path

from fastapi import Request
from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    """Server-only configuration loaded from nutrivo-ai-service/.env."""

    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    gemini_api_key: SecretStr | None = None
    gemini_model: str = "gemini-3.8-flash"
    firebase_project_id: str = "nutrivo-54be2"
    google_application_credentials: str | None = None
    allowed_origins: str = "http://localhost:8081,http://localhost:19006"
    allowed_origin_regex: str = r"^https?://(?:localhost|127\.0\.0\.1)(?::\d+)?$"
    max_upload_bytes: int = Field(default=8 * 1024 * 1024, ge=1)
    gemini_timeout_seconds: float = Field(default=35.0, gt=0, le=120)

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def cors_origin_regex(self) -> str | None:
        normalized = self.allowed_origin_regex.strip()
        return normalized or None


def get_settings(request: Request) -> Settings:
    return request.app.state.settings
