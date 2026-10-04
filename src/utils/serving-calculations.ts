import type {
  ConsumedNutrition,
  OptionalNutritionValue,
  PerServingNutrition,
} from '@/types/food-log';

const STORAGE_PRECISION = 3;

function requireNonNegativeFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative finite number.`);
  }
}

function requireOptionalNonNegativeFinite(
  value: OptionalNutritionValue,
  label: string,
): void {
  if (value !== null) requireNonNegativeFinite(value, label);
}

/** Removes floating-point noise while retaining useful precision for later totals. */
function roundForStorage(value: number): number {
  const scale = 10 ** STORAGE_PRECISION;
  return Math.round((value + Number.EPSILON) * scale) / scale;
}

function multiplyOptional(
  value: OptionalNutritionValue,
  servingsConsumed: number,
): OptionalNutritionValue {
  return value === null ? null : roundForStorage(value * servingsConsumed);
}

export function calculateConsumedNutrition(
  nutrition: PerServingNutrition,
  servingsConsumed: number,
): ConsumedNutrition {
  if (!Number.isFinite(servingsConsumed) || servingsConsumed <= 0) {
    throw new Error('Servings consumed must be a positive finite number.');
  }

  requireNonNegativeFinite(nutrition.caloriesPerServing, 'Calories per serving');
  requireNonNegativeFinite(nutrition.proteinPerServing, 'Protein per serving');
  requireNonNegativeFinite(
    nutrition.carbohydratesPerServing,
    'Carbohydrates per serving',
  );
  requireNonNegativeFinite(nutrition.fatPerServing, 'Fat per serving');
  requireOptionalNonNegativeFinite(nutrition.sugarPerServing, 'Sugar per serving');
  requireOptionalNonNegativeFinite(nutrition.sodiumPerServing, 'Sodium per serving');
  requireOptionalNonNegativeFinite(nutrition.fiberPerServing, 'Fiber per serving');

  return {
    calories: roundForStorage(nutrition.caloriesPerServing * servingsConsumed),
    protein: roundForStorage(nutrition.proteinPerServing * servingsConsumed),
    carbohydrates: roundForStorage(
      nutrition.carbohydratesPerServing * servingsConsumed,
    ),
    fat: roundForStorage(nutrition.fatPerServing * servingsConsumed),
    sugar: multiplyOptional(nutrition.sugarPerServing, servingsConsumed),
    sodium: multiplyOptional(nutrition.sodiumPerServing, servingsConsumed),
    fiber: multiplyOptional(nutrition.fiberPerServing, servingsConsumed),
  };
}
