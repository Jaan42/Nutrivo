from typing import Any

from fastapi.testclient import TestClient
from pydantic import SecretStr
import pytest

from app.auth import require_firebase_user
from app import auth as auth_module
from app.config import Settings
from app.main import create_app
from app.models.nutrition import NutritionLabelResult
from app.routes.nutrition import get_nutrition_service
from app.services.gemini_service import GeminiExtractionError


JPEG_BYTES = b"\xff\xd8\xff\xe0" + b"test-image"


class SuccessfulService:
    async def extract(self, image_data: bytes, mime_type: str) -> NutritionLabelResult:
        assert image_data == JPEG_BYTES
        assert mime_type == "image/jpeg"
        return NutritionLabelResult(
            foodName=None,
            servingSize="30 g",
            calories=150,
            protein=3,
            carbohydrates=24,
            fat=5,
            sugar=None,
            sodium=180,
            fiber=None,
        )


class FailingService:
    async def extract(self, _image_data: bytes, _mime_type: str) -> NutritionLabelResult:
        raise GeminiExtractionError("provider detail that must stay hidden")


def authenticated_user() -> dict[str, Any]:
    return {"uid": "test-user"}


def make_client(service: object | None = None, max_upload_bytes: int = 1024) -> TestClient:
    app = create_app(
        Settings(
            gemini_api_key=SecretStr("test-only"),
            max_upload_bytes=max_upload_bytes,
        )
    )
    if service is not None:
        app.dependency_overrides[require_firebase_user] = authenticated_user
        app.dependency_overrides[get_nutrition_service] = lambda: service
    return TestClient(app)


def test_health() -> None:
    response = make_client().get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.parametrize(
    "origin",
    [
        "http://localhost:8081",
        "http://localhost:8082",
        "http://127.0.0.1:8082",
        "https://127.0.0.1:49152",
    ],
)
def test_development_cors_preflight_allows_local_ports(origin: str) -> None:
    response = make_client().options(
        "/extract-nutrition-label",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    allowed_headers = response.headers["access-control-allow-headers"].lower()
    assert "authorization" in allowed_headers
    assert "content-type" in allowed_headers


def test_development_cors_rejects_unrelated_origin() -> None:
    response = make_client().options(
        "/extract-nutrition-label",
        headers={
            "Origin": "https://untrusted.example",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    assert response.status_code == 400
    assert response.text == "Disallowed CORS origin"


def test_production_cors_can_disable_localhost_regex() -> None:
    app = create_app(
        Settings(
            gemini_api_key=SecretStr("test-only"),
            allowed_origins="https://app.nutrivo.example",
            allowed_origin_regex="",
        )
    )
    client = TestClient(app)
    preflight_headers = {
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type",
    }

    local_response = client.options(
        "/extract-nutrition-label",
        headers={"Origin": "http://localhost:8082", **preflight_headers},
    )
    production_response = client.options(
        "/extract-nutrition-label",
        headers={"Origin": "https://app.nutrivo.example", **preflight_headers},
    )

    assert local_response.status_code == 400
    assert production_response.status_code == 200
    assert production_response.headers["access-control-allow-origin"] == (
        "https://app.nutrivo.example"
    )


def test_missing_token_is_rejected() -> None:
    response = make_client().post(
        "/extract-nutrition-label",
        files={"image": ("label.jpg", JPEG_BYTES, "image/jpeg")},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "missing_auth_token"


def test_valid_token_is_verified(monkeypatch: Any) -> None:
    app = create_app(Settings(gemini_api_key=SecretStr("test-only")))
    app.dependency_overrides[get_nutrition_service] = lambda: SuccessfulService()
    monkeypatch.setattr(auth_module, "get_firebase_app", lambda _settings: object())
    monkeypatch.setattr(
        auth_module.firebase_auth,
        "verify_id_token",
        lambda token, **_kwargs: {"uid": "verified-user"} if token == "valid-token" else {},
    )

    response = TestClient(app).post(
        "/extract-nutrition-label",
        files={"image": ("label.jpg", JPEG_BYTES, "image/jpeg")},
        headers={"Authorization": "Bearer valid-token"},
    )
    assert response.status_code == 200


def test_invalid_token_is_rejected(monkeypatch: Any) -> None:
    app = create_app(Settings(gemini_api_key=SecretStr("test-only")))
    monkeypatch.setattr(auth_module, "get_firebase_app", lambda _settings: object())

    def reject_token(_token: str, **_kwargs: Any) -> dict[str, Any]:
        raise ValueError("invalid token detail")

    monkeypatch.setattr(auth_module.firebase_auth, "verify_id_token", reject_token)
    response = TestClient(app).post(
        "/extract-nutrition-label",
        files={"image": ("label.jpg", JPEG_BYTES, "image/jpeg")},
        headers={"Authorization": "Bearer invalid-token"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_auth_token"
    assert "invalid token detail" not in response.text


def test_authenticated_extraction_returns_structured_result() -> None:
    response = make_client(SuccessfulService()).post(
        "/extract-nutrition-label",
        files={"image": ("label.jpg", JPEG_BYTES, "image/jpeg")},
        headers={"Authorization": "Bearer test-token"},
    )
    assert response.status_code == 200
    assert response.json()["calories"] == 150
    assert response.json()["sugar"] is None


def test_missing_image_is_controlled() -> None:
    response = make_client(SuccessfulService()).post(
        "/extract-nutrition-label",
        headers={"Authorization": "Bearer test-token"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "missing_image"


def test_unsupported_mime_is_rejected() -> None:
    response = make_client(SuccessfulService()).post(
        "/extract-nutrition-label",
        files={"image": ("label.gif", b"GIF89a", "image/gif")},
        headers={"Authorization": "Bearer test-token"},
    )
    assert response.status_code == 415
    assert response.json()["error"]["code"] == "unsupported_image_type"


def test_mime_signature_mismatch_is_rejected() -> None:
    response = make_client(SuccessfulService()).post(
        "/extract-nutrition-label",
        files={"image": ("label.png", JPEG_BYTES, "image/png")},
        headers={"Authorization": "Bearer test-token"},
    )
    assert response.status_code == 415
    assert response.json()["error"]["code"] == "invalid_image_content"


def test_oversized_image_is_rejected() -> None:
    response = make_client(SuccessfulService(), max_upload_bytes=8).post(
        "/extract-nutrition-label",
        files={"image": ("label.jpg", JPEG_BYTES, "image/jpeg")},
        headers={"Authorization": "Bearer test-token"},
    )
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "image_too_large"


def test_provider_error_is_controlled() -> None:
    response = make_client(FailingService()).post(
        "/extract-nutrition-label",
        files={"image": ("label.jpg", JPEG_BYTES, "image/jpeg")},
        headers={"Authorization": "Bearer test-token"},
    )
    assert response.status_code == 502
    assert response.json() == {
        "error": {
            "code": "extraction_failed",
            "message": "Nutrition extraction is temporarily unavailable. Try again.",
        }
    }
