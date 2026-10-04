import {
  MEAL_TYPES,
  type DailyNutritionTotals,
  type DashboardFoodLog,
  type MealSummary,
  type MealType,
} from '@/types/food-log';

export type ProgressValue = {
  percentage: number;
  visualProgress: number;
};

function emptyMealSummaries(): Record<MealType, MealSummary> {
  return MEAL_TYPES.reduce(
    (summaries, mealType) => {
      summaries[mealType] = { count: 0, calories: 0 };
      return summaries;
    },
    {} as Record<MealType, MealSummary>,
  );
}

function safeConsumedValue(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function calculateDailyNutritionTotals(
  foodLogs: readonly DashboardFoodLog[],
): DailyNutritionTotals {
  const totals: DailyNutritionTotals = {
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    fat: 0,
    meals: emptyMealSummaries(),
  };

  for (const foodLog of foodLogs) {
    const calories = safeConsumedValue(foodLog.calories);

    totals.calories += calories;
    totals.protein += safeConsumedValue(foodLog.protein);
    totals.carbohydrates += safeConsumedValue(foodLog.carbohydrates);
    totals.fat += safeConsumedValue(foodLog.fat);

    if (foodLog.mealType) {
      totals.meals[foodLog.mealType].count += 1;
      totals.meals[foodLog.mealType].calories += calories;
    }
  }

  return totals;
}

/** Keeps the displayed percentage finite while clamping only the visual fill. */
export function calculateProgress(consumed: number, target: number): ProgressValue {
  const safeConsumed = safeConsumedValue(consumed);
  const safeTarget = Number.isFinite(target) ? Math.max(0, target) : 0;

  if (safeTarget === 0) {
    return { percentage: 0, visualProgress: 0 };
  }

  const ratio = safeConsumed / safeTarget;

  return {
    percentage: Math.max(0, Math.round(ratio * 100)),
    visualProgress: Math.min(1, Math.max(0, ratio)),
  };
}
