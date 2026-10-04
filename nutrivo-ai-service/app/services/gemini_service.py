import asyncio
import logging
from contextlib import suppress

from google import genai
from google.genai import types
from pydantic import ValidationError

from app.config import Settings
from app.models.nutrition import NutritionLabelResult
from app.utils.validation import has_visible_nutrition_data


logger = logging.getLogger(__name__)

NUTRITION_LABEL_INSTRUCTION = """Read only Nutrition Facts values visibly printed in this image.

Do not infer nutrition from food or product appearance.
Do not estimate serving size.
Do not infer missing values.
Do not assume missing values are zero.
Return null for anything that is not clearly readable.

Return structured data only using these units:
- calories: kcal per serving
- protein: grams per serving
- carbohydrates: grams per serving
- fat: grams per serving
- sugar: grams per serving
- sodium: milligrams per serving
- fiber: grams per serving

The food name may be returned only if it is clearly visible in the image."""


class GeminiExtractionError(Exception):
    pass


class GeminiExtractionTimeoutError(GeminiExtractionError):
    pass


class InvalidGeminiResponseError(GeminiExtractionError):
    pass


class NutritionLabelNotDetectedError(GeminiExtractionError):
    pass


class GeminiNutritionService:
    def __init__(self, settings: Settings) -> None:
        if settings.gemini_api_key is None or not settings.gemini_api_key.get_secret_value():
            raise GeminiExtractionError("Gemini is not configured.")
        self._api_key = settings.gemini_api_key.get_secret_value()
        self._model = settings.gemini_model
        self._timeout_seconds = settings.gemini_timeout_seconds

    async def extract(self, image_data: bytes, mime_type: str) -> NutritionLabelResult:
        client = genai.Client(api_key=self._api_key)
        try:
            response = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=self._model,
                    contents=[
                        types.Part.from_bytes(data=image_data, mime_type=mime_type),
                        NUTRITION_LABEL_INSTRUCTION,
                    ],
                    config=types.GenerateContentConfig(
                        temperature=0,
                        response_mime_type="application/json",
                        response_schema=NutritionLabelResult,
                    ),
                ),
                timeout=self._timeout_seconds,
            )
        except TimeoutError as error:
            raise GeminiExtractionTimeoutError("Gemini extraction timed out.") from error
        except Exception as error:
            logger.exception("Gemini nutrition-label extraction failed")
            raise GeminiExtractionError("Gemini extraction failed.") from error
        finally:
            with suppress(Exception):
                await client.aio.aclose()

        try:
            if isinstance(response.parsed, NutritionLabelResult):
                result = response.parsed
            else:
                result = NutritionLabelResult.model_validate_json(response.text or "")
        except (ValidationError, ValueError, TypeError) as error:
            raise InvalidGeminiResponseError("Gemini returned invalid structured data.") from error

        if not has_visible_nutrition_data(result):
            raise NutritionLabelNotDetectedError("No readable Nutrition Facts values were detected.")
        return result
