export const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;

export type MealType = (typeof MEAL_TYPES)[number];

export type OptionalNutritionValue = number | null;

export type FoodLogSource = 'manual' | 'nutrition-label';

export interface PerServingNutrition {
  caloriesPerServing: number;
  proteinPerServing: number;
  carbohydratesPerServing: number;
  fatPerServing: number;
  sugarPerServing: OptionalNutritionValue;
  sodiumPerServing: OptionalNutritionValue;
  fiberPerServing: OptionalNutritionValue;
}

export interface ConsumedNutrition {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  sugar: OptionalNutritionValue;
  sodium: OptionalNutritionValue;
  fiber: OptionalNutritionValue;
}

export interface ManualFoodLogInput {
  foodName: string;
  servingSize: string;
  mealType: MealType;
  servingsConsumed: number;
  nutritionPerServing: PerServingNutrition;
}

/** Text fields remain strings while the person is typing. */
export interface ManualFoodFormValues {
  foodName: string;
  servingSize: string;
  caloriesPerServing: string;
  proteinPerServing: string;
  carbohydratesPerServing: string;
  fatPerServing: string;
  sugarPerServing: string;
  sodiumPerServing: string;
  fiberPerServing: string;
  servingsConsumed: string;
  mealType: MealType | null;
}

export type ManualFoodValidationErrors = Partial<
  Record<keyof ManualFoodFormValues, string>
>;

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
