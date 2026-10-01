/** Choices and data shared by profile setup, summary, and nutrition calculations. */
export const SEX_OPTIONS = ['Male', 'Female'] as const;
export const ACTIVITY_LEVELS = [
  'Sedentary',
  'Lightly Active',
  'Moderately Active',
  'Very Active',
  'Extra Active',
] as const;
export const GOALS = ['Lose Weight', 'Maintain Weight', 'Gain Weight'] as const;

export type Sex = (typeof SEX_OPTIONS)[number];
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];
export type Goal = (typeof GOALS)[number];

/** Text fields stay as strings while a person is typing. */
export interface ProfileFormValues {
  age: string;
  sex: Sex | null;
  heightCm: string;
  weightKg: string;
  activityLevel: ActivityLevel | null;
  goal: Goal | null;
}

export type ProfileValidationErrors = Partial<
  Record<keyof ProfileFormValues, string>
>;

export interface ProfileInput {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
}

/** Rounded values ready to display and save under users/{uid}. */
export interface NutritionProfile extends ProfileInput {
  bmi: number;
  bmr: number;
  tdee: number;
  calorieTarget: number;
  proteinTarget: number;
  carbohydrateTarget: number;
  fatTarget: number;
}
