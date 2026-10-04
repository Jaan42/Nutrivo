import type { MealType, PerServingNutrition } from '@/types/food-log';

export type NutritionLabelImageSource = 'camera' | 'gallery';

/** A temporary reference to an image. Image bytes are never placed in route params. */
export interface NutritionLabelImage {
  uri: string;
  source: NutritionLabelImageSource;
  width?: number;
  height?: number;
  mimeType?: string;
  fileName?: string | null;
}

/** Values returned by a future secure extraction endpoint. Unknown values stay null. */
export interface ExtractedNutritionLabel {
  foodName: string | null;
  servingSize: string | null;
  calories: number | null;
  protein: number | null;
  carbohydrates: number | null;
  fat: number | null;
  sugar: number | null;
  sodium: number | null;
  fiber: number | null;
}

/** Text values are retained while the person reviews or enters label data. */
export interface NutritionLabelReviewFormValues {
  foodName: string;
  servingSize: string;
  calories: string;
  protein: string;
  carbohydrates: string;
  fat: string;
  sugar: string;
  sodium: string;
  fiber: string;
}

export type NutritionLabelReviewErrors = Partial<
  Record<keyof NutritionLabelReviewFormValues, string>
>;

export interface ReviewedNutritionLabel {
  foodName: string;
  servingSize: string;
  nutritionPerServing: PerServingNutrition;
}

export interface NutritionLabelServingFormValues {
  servingsConsumed: string;
  mealType: MealType | null;
}

export type NutritionLabelServingErrors = Partial<
  Record<keyof NutritionLabelServingFormValues, string>
>;

export type NutritionLabelReviewMode = 'extracted' | 'manual-fallback';
