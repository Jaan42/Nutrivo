import math

import pytest
from pydantic import ValidationError

from app.models.nutrition import NutritionLabelResult


def test_invalid_nutrition_values_become_null() -> None:
    result = NutritionLabelResult.model_validate(
        {
            "foodName": "  Test Food  ",
            "servingSize": None,
            "calories": 350,
            "protein": "12",
            "carbohydrates": -1,
            "fat": math.inf,
            "sugar": math.nan,
            "sodium": 240,
            "fiber": 0,
        }
    )

    assert result.foodName == "Test Food"
    assert result.calories == 350
    assert result.protein is None
    assert result.carbohydrates is None
    assert result.fat is None
    assert result.sugar is None
    assert result.sodium == 240
    assert result.fiber == 0


def test_non_object_response_is_rejected() -> None:
    with pytest.raises(ValidationError):
        NutritionLabelResult.model_validate([])
