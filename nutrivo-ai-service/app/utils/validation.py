from fastapi import UploadFile

from app.errors import ApiError
from app.models.nutrition import NutritionLabelResult


SUPPORTED_IMAGE_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})
UPLOAD_CHUNK_BYTES = 64 * 1024


def detect_image_mime(data: bytes) -> str | None:
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if len(data) >= 12 and data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return "image/webp"
    return None


async def read_validated_image(upload: UploadFile, max_bytes: int) -> tuple[bytes, str]:
    declared_mime = (upload.content_type or "").split(";", 1)[0].strip().lower()
    if declared_mime not in SUPPORTED_IMAGE_TYPES:
        raise ApiError(
            415,
            "unsupported_image_type",
            "Upload a JPEG, PNG, or WebP Nutrition Facts image.",
        )

    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await upload.read(UPLOAD_CHUNK_BYTES)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise ApiError(
                413,
                "image_too_large",
                f"The image exceeds the {max_bytes // (1024 * 1024)} MB upload limit.",
            )
        chunks.append(chunk)

    data = b"".join(chunks)
    if not data:
        raise ApiError(400, "empty_image", "The uploaded image is empty.")

    detected_mime = detect_image_mime(data)
    if detected_mime is None or detected_mime != declared_mime:
        raise ApiError(
            415,
            "invalid_image_content",
            "The uploaded file content does not match a supported image type.",
        )

    return data, detected_mime


def has_visible_nutrition_data(result: NutritionLabelResult) -> bool:
    return any(
        value is not None
        for value in (
            result.servingSize,
            result.calories,
            result.protein,
            result.carbohydrates,
            result.fat,
            result.sugar,
            result.sodium,
            result.fiber,
        )
    )
