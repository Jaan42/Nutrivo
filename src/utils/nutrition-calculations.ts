import {
  type ActivityLevel,
  type Goal,
  type NutritionProfile,
  type ProfileInput,
  type Sex,
} from '@/types/nutrition-profile';
import { validateProfileInput } from '@/utils/profile-validation';

export const ACTIVITY_MULTIPLIERS: Readonly<Record<ActivityLevel, number>> = {
  Sedentary: 1.2,
  'Lightly Active': 1.375,
  'Moderately Active': 1.55,
  'Very Active': 1.725,
  'Extra Active': 1.9,
};

const GOAL_CALORIE_ADJUSTMENTS: Readonly<Record<Goal, number>> = {
  'Lose Weight': -500,
  'Maintain Weight': 0,
  'Gain Weight': 500,
};

export const MIN_DAILY_CALORIES = 1200;

function requirePositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive, finite number.`);
  }
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Weight in kilograms divided by height in meters squared. */
export function calculateBmi(weightKg: number, heightCm: number): number {
  requirePositiveFinite(weightKg, 'Weight');
  requirePositiveFinite(heightCm, 'Height');
  return weightKg / (heightCm / 100) ** 2;
}

/** Mifflin-St Jeor basal metabolic rate, in kcal per day. */
export function calculateBmr(
  age: number,
  sex: Sex,
  heightCm: number,
  weightKg: number,
): number {
  requirePositiveFinite(age, 'Age');
  requirePositiveFinite(heightCm, 'Height');
  requirePositiveFinite(weightKg, 'Weight');
  if (sex !== 'Male' && sex !== 'Female') {
    throw new Error('Sex must be Male or Female.');
  }

  return (
    10 * weightKg +
    6.25 * heightCm -
    5 * age +
    (sex === 'Male' ? 5 : -161)
  );
}

/** Total daily energy expenditure, in kcal per day. */
export function calculateTdee(bmr: number, activityLevel: ActivityLevel): number {
  requirePositiveFinite(bmr, 'BMR');
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel];
  requirePositiveFinite(multiplier, 'Activity multiplier');
  return bmr * multiplier;
}

/** Goal-adjusted daily calories, with a simple 1,200 kcal lower guard. */
export function calculateDailyCalorieTarget(tdee: number, goal: Goal): number {
  requirePositiveFinite(tdee, 'TDEE');
  const adjustment = GOAL_CALORIE_ADJUSTMENTS[goal];
  if (!Number.isFinite(adjustment)) {
    throw new Error('Goal is invalid.');
  }
  return Math.max(MIN_DAILY_CALORIES, tdee + adjustment);
}

/** 30% of calories, divided by 4 kcal per gram. */
export function calculateProteinTarget(calorieTarget: number): number {
  requirePositiveFinite(calorieTarget, 'Calorie target');
  return Math.round((calorieTarget * 0.3) / 4);
}

/** 40% of calories, divided by 4 kcal per gram. */
export function calculateCarbohydrateTarget(calorieTarget: number): number {
  requirePositiveFinite(calorieTarget, 'Calorie target');
  return Math.round((calorieTarget * 0.4) / 4);
}

/** 30% of calories, divided by 9 kcal per gram. */
export function calculateFatTarget(calorieTarget: number): number {
  requirePositiveFinite(calorieTarget, 'Calorie target');
  return Math.round((calorieTarget * 0.3) / 9);
}

/** Calculates from full-precision intermediate values, then rounds saved values. */
export function calculateNutritionProfile(input: ProfileInput): NutritionProfile {
  if (Object.keys(validateProfileInput(input)).length > 0) {
    throw new Error('Profile input is invalid.');
  }

  const bmi = calculateBmi(input.weightKg, input.heightCm);
  const bmr = calculateBmr(input.age, input.sex, input.heightCm, input.weightKg);
  const tdee = calculateTdee(bmr, input.activityLevel);
  const calorieTarget = calculateDailyCalorieTarget(tdee, input.goal);
  const roundedCalorieTarget = Math.round(calorieTarget);

  return {
    ...input,
    bmi: roundToOneDecimal(bmi),
    bmr: roundToOneDecimal(bmr),
    tdee: Math.round(tdee),
    calorieTarget: roundedCalorieTarget,
    proteinTarget: calculateProteinTarget(roundedCalorieTarget),
    carbohydrateTarget: calculateCarbohydrateTarget(roundedCalorieTarget),
    fatTarget: calculateFatTarget(roundedCalorieTarget),
  };
}
