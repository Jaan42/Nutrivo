import asyncio
from types import SimpleNamespace
from typing import Any

import pytest
from pydantic import SecretStr

from app.config import Settings
from app.models.nutrition import NutritionLabelResult
from app.services import gemini_service as service_module
from app.services.gemini_service import (
    GeminiExtractionTimeoutError,
    GeminiNutritionService,
    InvalidGeminiResponseError,
    NutritionLabelNotDetectedError,
)


class FakeModels:
    def __init__(self, response: object, delay: float = 0) -> None:
        self.response = response
        self.delay = delay
        self.call: dict[str, Any] | None = None

    async def generate_content(self, **kwargs: Any) -> object:
        self.call = kwargs
        if self.delay:
            await asyncio.sleep(self.delay)
        return self.response


class FakeAsyncClient:
    def __init__(self, models: FakeModels) -> None:
        self.models = models
        self.closed = False

    async def aclose(self) -> None:
        self.closed = True


class FakeClient:
    def __init__(self, models: FakeModels) -> None:
        self.aio = FakeAsyncClient(models)


@pytest.mark.asyncio
async def test_gemini_service_uses_structured_output(monkeypatch: Any) -> None:
    parsed = NutritionLabelResult(
        servingSize="1 cup",
        calories=350,
        protein=12,
        carbohydrates=40,
        fat=8,
    )
    models = FakeModels(SimpleNamespace(parsed=parsed, text=None))
    fake_client = FakeClient(models)
    monkeypatch.setattr(service_module.genai, "Client", lambda **_kwargs: fake_client)
    service = GeminiNutritionService(Settings(gemini_api_key=SecretStr("test-only")))

    result = await service.extract(b"image", "image/jpeg")

    assert result.calories == 350
    assert models.call is not None
    assert models.call["model"] == "gemini-3.8-flash"
    assert models.call["config"].response_mime_type == "application/json"
    assert fake_client.aio.closed is True


@pytest.mark.asyncio
async def test_gemini_timeout_is_controlled(monkeypatch: Any) -> None:
    models = FakeModels(SimpleNamespace(parsed=None, text=""), delay=0.05)
    fake_client = FakeClient(models)
    monkeypatch.setattr(service_module.genai, "Client", lambda **_kwargs: fake_client)
    service = GeminiNutritionService(
        Settings(
            gemini_api_key=SecretStr("test-only"),
            gemini_timeout_seconds=0.01,
        )
    )

    with pytest.raises(GeminiExtractionTimeoutError):
        await service.extract(b"image", "image/jpeg")
    assert fake_client.aio.closed is True


@pytest.mark.asyncio
async def test_invalid_structured_response_is_rejected(monkeypatch: Any) -> None:
    models = FakeModels(SimpleNamespace(parsed=None, text="not-json"))
    fake_client = FakeClient(models)
    monkeypatch.setattr(service_module.genai, "Client", lambda **_kwargs: fake_client)
    service = GeminiNutritionService(Settings(gemini_api_key=SecretStr("test-only")))

    with pytest.raises(InvalidGeminiResponseError):
        await service.extract(b"image", "image/jpeg")


@pytest.mark.asyncio
async def test_non_label_with_no_visible_values_is_rejected(monkeypatch: Any) -> None:
    models = FakeModels(
        SimpleNamespace(parsed=NutritionLabelResult(), text=None)
    )
    fake_client = FakeClient(models)
    monkeypatch.setattr(service_module.genai, "Client", lambda **_kwargs: fake_client)
    service = GeminiNutritionService(Settings(gemini_api_key=SecretStr("test-only")))

    with pytest.raises(NutritionLabelNotDetectedError):
        await service.extract(b"image", "image/jpeg")
