import {
  MEAL_TYPES,
  type ManualFoodFormValues,
  type ManualFoodLogInput,
  type ManualFoodValidationErrors,
  type OptionalNutritionValue,
  type PerServingNutrition,
} from '@/types/food-log';

const DECIMAL_PATTERN = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/;

const REQUIRED_NUTRIENTS = [
  ['caloriesPerServing', 'Calories'],
  ['proteinPerServing', 'Protein'],
  ['carbohydratesPerServing', 'Carbohydrates'],
  ['fatPerServing', 'Fat'],
] as const;

const OPTIONAL_NUTRIENTS = [
  ['sugarPerServing', 'Sugar'],
  ['sodiumPerServing', 'Sodium'],
  ['fiberPerServing', 'Fiber'],
] as const;

function parseDecimal(value: string): number | null {
  const normalized = value.trim();
  if (!normalized || !DECIMAL_PATTERN.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function validateRequiredNutrient(
  value: string,
  label: string,
): string | undefined {
  if (!value.trim()) return `Enter ${label.toLowerCase()} per serving.`;

  const parsed = parseDecimal(value);
  if (parsed === null) return `Enter a valid ${label.toLowerCase()} amount.`;
  if (parsed < 0) return `${label} cannot be negative.`;
  return undefined;
}

function validateOptionalNutrient(
  value: string,
  label: string,
): string | undefined {
  if (!value.trim()) return undefined;

  const parsed = parseDecimal(value);
  if (parsed === null) return `Enter a valid ${label.toLowerCase()} amount.`;
  if (parsed < 0) return `${label} cannot be negative.`;
  return undefined;
}

export function validateManualFoodForm(
  values: ManualFoodFormValues,
): ManualFoodValidationErrors {
  const errors: ManualFoodValidationErrors = {};

  if (!values.foodName.trim()) errors.foodName = 'Enter a food name.';
  if (!values.servingSize.trim()) errors.servingSize = 'Enter a serving size.';

  for (const [field, label] of REQUIRED_NUTRIENTS) {
    const error = validateRequiredNutrient(values[field], label);
    if (error) errors[field] = error;
  }

  for (const [field, label] of OPTIONAL_NUTRIENTS) {
    const error = validateOptionalNutrient(values[field], label);
    if (error) errors[field] = error;
  }

  const servingsConsumed = parseDecimal(values.servingsConsumed);
  if (!values.servingsConsumed.trim()) {
    errors.servingsConsumed = 'Enter the number of servings consumed.';
  } else if (servingsConsumed === null) {
    errors.servingsConsumed = 'Enter a valid decimal serving amount.';
  } else if (servingsConsumed <= 0) {
    errors.servingsConsumed = 'Servings consumed must be greater than zero.';
  }

  if (!values.mealType || !MEAL_TYPES.includes(values.mealType)) {
    errors.mealType = 'Select a meal category.';
  }

  return errors;
}

function parseOptionalNutrient(value: string): OptionalNutritionValue {
  return value.trim() ? parseDecimal(value) : null;
}

function parseNutrition(values: ManualFoodFormValues): PerServingNutrition | null {
  const caloriesPerServing = parseDecimal(values.caloriesPerServing);
  const proteinPerServing = parseDecimal(values.proteinPerServing);
  const carbohydratesPerServing = parseDecimal(values.carbohydratesPerServing);
  const fatPerServing = parseDecimal(values.fatPerServing);
  const sugarPerServing = parseOptionalNutrient(values.sugarPerServing);
  const sodiumPerServing = parseOptionalNutrient(values.sodiumPerServing);
  const fiberPerServing = parseOptionalNutrient(values.fiberPerServing);

  if (
    caloriesPerServing === null ||
    caloriesPerServing < 0 ||
    proteinPerServing === null ||
    proteinPerServing < 0 ||
    carbohydratesPerServing === null ||
    carbohydratesPerServing < 0 ||
    fatPerServing === null ||
    fatPerServing < 0 ||
    (sugarPerServing !== null && sugarPerServing < 0) ||
    (sodiumPerServing !== null && sodiumPerServing < 0) ||
    (fiberPerServing !== null && fiberPerServing < 0)
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

export function parseManualFoodForm(
  values: ManualFoodFormValues,
): ManualFoodLogInput | null {
  if (Object.keys(validateManualFoodForm(values)).length > 0) return null;

  const nutritionPerServing = parseNutrition(values);
  const servingsConsumed = parseDecimal(values.servingsConsumed);
  if (!nutritionPerServing || servingsConsumed === null || !values.mealType) return null;

  return {
    foodName: values.foodName.trim(),
    servingSize: values.servingSize.trim(),
    mealType: values.mealType,
    servingsConsumed,
    nutritionPerServing,
  };
}

/** Returns only when all numeric values needed for a trustworthy preview are valid. */
export function parseManualFoodPreview(
  values: ManualFoodFormValues,
): Pick<ManualFoodLogInput, 'nutritionPerServing' | 'servingsConsumed'> | null {
  const nutritionPerServing = parseNutrition(values);
  const servingsConsumed = parseDecimal(values.servingsConsumed);

  if (!nutritionPerServing || servingsConsumed === null || servingsConsumed <= 0) return null;
  return { nutritionPerServing, servingsConsumed };
}
