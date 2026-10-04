import math
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class NutritionLabelResult(BaseModel):
    """Only values visibly printed on a Nutrition Facts label."""

    model_config = ConfigDict(extra="ignore")

    foodName: str | None = Field(default=None, description="Product name if clearly visible")
    servingSize: str | None = Field(
        default=None,
        description="Serving size text exactly as clearly visible on the label",
    )
    calories: float | None = Field(default=None, description="Calories per serving in kcal")
    protein: float | None = Field(default=None, description="Protein per serving in grams")
    carbohydrates: float | None = Field(
        default=None,
        description="Total carbohydrates per serving in grams",
    )
    fat: float | None = Field(default=None, description="Total fat per serving in grams")
    sugar: float | None = Field(default=None, description="Sugar per serving in grams")
    sodium: float | None = Field(default=None, description="Sodium per serving in milligrams")
    fiber: float | None = Field(default=None, description="Dietary fiber per serving in grams")

    @field_validator("foodName", "servingSize", mode="before")
    @classmethod
    def normalize_text(cls, value: Any) -> str | None:
        if value is None or not isinstance(value, str):
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator(
        "calories",
        "protein",
        "carbohydrates",
        "fat",
        "sugar",
        "sodium",
        "fiber",
        mode="before",
    )
    @classmethod
    def normalize_nutrition_number(cls, value: Any) -> float | None:
        if value is None or isinstance(value, bool) or not isinstance(value, (int, float)):
            return None
        number = float(value)
        return number if math.isfinite(number) and number >= 0 else None
