export const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;

export type MealType = (typeof MEAL_TYPES)[number];

/** The nutrition fields the dashboard needs from users/{uid}/foodLogs/{logId}. */
export interface DashboardFoodLog {
  id: string;
  mealType: MealType | null;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

export interface MealSummary {
  count: number;
  calories: number;
}

export interface DailyNutritionTotals {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  meals: Record<MealType, MealSummary>;
}
