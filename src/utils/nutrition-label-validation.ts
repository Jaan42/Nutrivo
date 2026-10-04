import type { ManualFoodLogInput, PerServingNutrition } from '@/types/food-log';
import type {
  ExtractedNutritionLabel,
  NutritionLabelReviewErrors,
  NutritionLabelReviewFormValues,
  NutritionLabelServingErrors,
  NutritionLabelServingFormValues,
  ReviewedNutritionLabel,
} from '@/types/nutrition-label';
import {
  parseNutritionDecimal,
  parseOptionalNutritionValue,
  validateOptionalNutritionValue,
  validateRequiredNutritionValue,
} from '@/utils/manual-food-validation';

const REQUIRED_NUTRIENTS = [
  ['calories', 'Calories'],
  ['protein', 'Protein'],
  ['carbohydrates', 'Carbohydrates'],
  ['fat', 'Fat'],
] as const;

const OPTIONAL_NUTRIENTS = [
  ['sugar', 'Sugar'],
  ['sodium', 'Sodium'],
  ['fiber', 'Fiber'],
] as const;

export const EMPTY_NUTRITION_LABEL_REVIEW_FORM: NutritionLabelReviewFormValues = {
  foodName: '',
  servingSize: '',
  calories: '',
  protein: '',
  carbohydrates: '',
  fat: '',
  sugar: '',
  sodium: '',
  fiber: '',
};

function editableValue(value: string | number | null): string {
  return value === null ? '' : String(value);
}

export function toNutritionLabelReviewForm(
  extracted: ExtractedNutritionLabel,
): NutritionLabelReviewFormValues {
  return {
    foodName: editableValue(extracted.foodName),
    servingSize: editableValue(extracted.servingSize),
    calories: editableValue(extracted.calories),
    protein: editableValue(extracted.protein),
    carbohydrates: editableValue(extracted.carbohydrates),
    fat: editableValue(extracted.fat),
    sugar: editableValue(extracted.sugar),
    sodium: editableValue(extracted.sodium),
    fiber: editableValue(extracted.fiber),
  };
}

export function reviewedNutritionToReviewForm(
  reviewed: ReviewedNutritionLabel,
): NutritionLabelReviewFormValues {
  return {
    foodName: reviewed.foodName,
    servingSize: reviewed.servingSize,
    calories: String(reviewed.nutritionPerServing.caloriesPerServing),
    protein: String(reviewed.nutritionPerServing.proteinPerServing),
    carbohydrates: String(reviewed.nutritionPerServing.carbohydratesPerServing),
    fat: String(reviewed.nutritionPerServing.fatPerServing),
    sugar: editableValue(reviewed.nutritionPerServing.sugarPerServing),
    sodium: editableValue(reviewed.nutritionPerServing.sodiumPerServing),
    fiber: editableValue(reviewed.nutritionPerServing.fiberPerServing),
  };
}

export function validateNutritionLabelReview(
  values: NutritionLabelReviewFormValues,
): NutritionLabelReviewErrors {
  const errors: NutritionLabelReviewErrors = {};
  if (!values.foodName.trim()) errors.foodName = 'Enter a food name.';
  if (!values.servingSize.trim()) errors.servingSize = 'Enter a serving size.';

  for (const [field, label] of REQUIRED_NUTRIENTS) {
    const error = validateRequiredNutritionValue(values[field], label);
    if (error) errors[field] = error;
  }

  for (const [field, label] of OPTIONAL_NUTRIENTS) {
    const error = validateOptionalNutritionValue(values[field], label);
    if (error) errors[field] = error;
  }

  return errors;
}

function parseReviewNutrition(
  values: NutritionLabelReviewFormValues,
): PerServingNutrition | null {
  const caloriesPerServing = parseNutritionDecimal(values.calories);
  const proteinPerServing = parseNutritionDecimal(values.protein);
  const carbohydratesPerServing = parseNutritionDecimal(values.carbohydrates);
  const fatPerServing = parseNutritionDecimal(values.fat);
  const sugarPerServing = parseOptionalNutritionValue(values.sugar);
  const sodiumPerServing = parseOptionalNutritionValue(values.sodium);
  const fiberPerServing = parseOptionalNutritionValue(values.fiber);

  if (
    caloriesPerServing === null ||
    proteinPerServing === null ||
    carbohydratesPerServing === null ||
    fatPerServing === null
  ) {
    return null;
  }

  return {
    caloriesPerServing,
    proteinPerServing,
    carbohydratesPerServing,
    fatPerServing,
    sugarPerServing,
    sodiumPerServing,
    fiberPerServing,
  };
}

export function parseNutritionLabelReview(
  values: NutritionLabelReviewFormValues,
): ReviewedNutritionLabel | null {
  if (Object.keys(validateNutritionLabelReview(values)).length > 0) return null;
  const nutritionPerServing = parseReviewNutrition(values);
  if (!nutritionPerServing) return null;

  return {
    foodName: values.foodName.trim(),
    servingSize: values.servingSize.trim(),
    nutritionPerServing,
  };
}

export function validateNutritionLabelServing(
  values: NutritionLabelServingFormValues,
): NutritionLabelServingErrors {
  const errors: NutritionLabelServingErrors = {};
  const servingsConsumed = parseNutritionDecimal(values.servingsConsumed);

  if (!values.servingsConsumed.trim()) {
    errors.servingsConsumed = 'Enter the number of servings consumed.';
  } else if (servingsConsumed === null) {
    errors.servingsConsumed = 'Enter a valid decimal serving amount.';
  } else if (servingsConsumed <= 0) {
    errors.servingsConsumed = 'Servings consumed must be greater than zero.';
  }

  if (!values.mealType) errors.mealType = 'Select a meal category.';
  return errors;
}

export function toNutritionLabelFoodLogInput(
  reviewed: ReviewedNutritionLabel,
  values: NutritionLabelServingFormValues,
): ManualFoodLogInput | null {
  if (Object.keys(validateNutritionLabelServing(values)).length > 0) return null;
  const servingsConsumed = parseNutritionDecimal(values.servingsConsumed);
  if (servingsConsumed === null || !values.mealType) return null;

  return {
    ...reviewed,
    mealType: values.mealType,
    servingsConsumed,
  };
}
