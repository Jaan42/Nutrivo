from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, UploadFile

from app.auth import require_firebase_user
from app.config import Settings, get_settings
from app.errors import ApiError
from app.models.nutrition import NutritionLabelResult
from app.services.gemini_service import (
    GeminiExtractionError,
    GeminiExtractionTimeoutError,
    GeminiNutritionService,
    InvalidGeminiResponseError,
    NutritionLabelNotDetectedError,
)
from app.utils.validation import read_validated_image


router = APIRouter(tags=["nutrition"])


def get_nutrition_service(settings: Settings = Depends(get_settings)) -> GeminiNutritionService:
    try:
        return GeminiNutritionService(settings)
    except GeminiExtractionError as error:
        raise ApiError(
            503,
            "extraction_not_configured",
            "Nutrition-label extraction is not configured on the server.",
        ) from error


@router.post("/extract-nutrition-label", response_model=NutritionLabelResult)
async def extract_nutrition_label(
    image: Annotated[UploadFile | None, File()] = None,
    _user: dict[str, Any] = Depends(require_firebase_user),
    settings: Settings = Depends(get_settings),
    service: GeminiNutritionService = Depends(get_nutrition_service),
) -> NutritionLabelResult:
    if image is None:
        raise ApiError(400, "missing_image", "A Nutrition Facts image is required.")

    try:
        image_data, mime_type = await read_validated_image(image, settings.max_upload_bytes)
        return await service.extract(image_data, mime_type)
    except GeminiExtractionTimeoutError as error:
        raise ApiError(504, "extraction_timeout", "Nutrition extraction timed out. Try again.") from error
    except NutritionLabelNotDetectedError as error:
        raise ApiError(
            422,
            "nutrition_label_not_detected",
            "No readable Nutrition Facts label was detected in this image.",
        ) from error
    except InvalidGeminiResponseError as error:
        raise ApiError(
            502,
            "invalid_extraction_response",
            "The extraction service returned invalid data. Try again.",
        ) from error
    except GeminiExtractionError as error:
        raise ApiError(
            502,
            "extraction_failed",
            "Nutrition extraction is temporarily unavailable. Try again.",
        ) from error
    finally:
        await image.close()
