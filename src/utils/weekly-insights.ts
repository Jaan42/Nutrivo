import type { FoodLogRecord } from '@/types/food-log';
import { calculateDailyNutritionTotals } from '@/utils/dashboard-calculations';
import { parseLocalDateKey } from '@/utils/date';

export type WeeklyNutrientTotals = {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
};

export type WeeklyNutritionDay = WeeklyNutrientTotals & {
  dateKey: string;
  entryCount: number;
  tracked: boolean;
};

export type CalorieVariationBand = 'small' | 'moderate' | 'large';

export type WeeklyNutritionSummary = {
  days: WeeklyNutritionDay[];
  trackedDayCount: number;
  totalEntries: number;
  averages: WeeklyNutrientTotals;
  highestCalorieDay: WeeklyNutritionDay | null;
  lowestCalorieDay: WeeklyNutritionDay | null;
  calorieRange: number | null;
  variationBand: CalorieVariationBand | null;
};

/**
 * UI-only calorie-range bands for describing logged-day variation.
 * These are presentation thresholds, not nutrition or medical standards.
 */
export const CALORIE_VARIATION_THRESHOLDS = {
  smallMaximumKcal: 300,
  moderateMaximumKcal: 700,
} as const;

const ZERO_NUTRIENTS: WeeklyNutrientTotals = {
  calories: 0,
  protein: 0,
  carbohydrates: 0,
  fat: 0,
};

function addNutrients(
  total: WeeklyNutrientTotals,
  value: WeeklyNutrientTotals,
): WeeklyNutrientTotals {
  return {
    calories: total.calories + value.calories,
    protein: total.protein + value.protein,
    carbohydrates: total.carbohydrates + value.carbohydrates,
    fat: total.fat + value.fat,
  };
}

function averageNutrients(
  total: WeeklyNutrientTotals,
  trackedDayCount: number,
): WeeklyNutrientTotals {
  if (trackedDayCount <= 0) return { ...ZERO_NUTRIENTS };

  return {
    calories: total.calories / trackedDayCount,
    protein: total.protein / trackedDayCount,
    carbohydrates: total.carbohydrates / trackedDayCount,
    fat: total.fat / trackedDayCount,
  };
}

function getVariationBand(calorieRange: number): CalorieVariationBand {
  if (calorieRange <= CALORIE_VARIATION_THRESHOLDS.smallMaximumKcal) return 'small';
  if (calorieRange <= CALORIE_VARIATION_THRESHOLDS.moderateMaximumKcal) {
    return 'moderate';
  }
  return 'large';
}

/** Builds seven daily totals while retaining untracked dates as explicit empty days. */
export function calculateWeeklyNutritionSummary(
  foodLogs: readonly FoodLogRecord[],
  dateKeys: readonly string[],
): WeeklyNutritionSummary {
  const logsByDate = new Map<string, FoodLogRecord[]>();
  for (const dateKey of dateKeys) logsByDate.set(dateKey, []);

  for (const foodLog of foodLogs) {
    logsByDate.get(foodLog.dateKey)?.push(foodLog);
  }

  const days = dateKeys.map((dateKey): WeeklyNutritionDay => {
    const dayLogs = logsByDate.get(dateKey) ?? [];
    const totals = calculateDailyNutritionTotals(dayLogs);

    return {
      dateKey,
      entryCount: dayLogs.length,
      tracked: dayLogs.length > 0,
      calories: totals.calories,
      protein: totals.protein,
      carbohydrates: totals.carbohydrates,
      fat: totals.fat,
    };
  });
  const trackedDays = days.filter((day) => day.tracked);
  const weeklyTotals = trackedDays.reduce<WeeklyNutrientTotals>(
    (total, day) => addNutrients(total, day),
    { ...ZERO_NUTRIENTS },
  );
  const trackedDayCount = trackedDays.length;

  let highestCalorieDay: WeeklyNutritionDay | null = null;
  let lowestCalorieDay: WeeklyNutritionDay | null = null;
  for (const day of trackedDays) {
    if (!highestCalorieDay || day.calories > highestCalorieDay.calories) {
      highestCalorieDay = day;
    }
    if (!lowestCalorieDay || day.calories < lowestCalorieDay.calories) {
      lowestCalorieDay = day;
    }
  }

  const calorieRange =
    trackedDayCount >= 2 && highestCalorieDay && lowestCalorieDay
      ? highestCalorieDay.calories - lowestCalorieDay.calories
      : null;

  return {
    days,
    trackedDayCount,
    totalEntries: trackedDays.reduce((total, day) => total + day.entryCount, 0),
    averages: averageNutrients(weeklyTotals, trackedDayCount),
    highestCalorieDay,
    lowestCalorieDay,
    calorieRange,
    variationBand: calorieRange === null ? null : getVariationBand(calorieRange),
  };
}

function formatCalories(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function formatWeekday(dateKey: string): string {
  const date = parseLocalDateKey(dateKey);
  if (!date) return 'Unknown day';
  return new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date);
}

/** Produces concise, descriptive observations from tracked days only. */
export function createWeeklyNutritionInsights(
  summary: WeeklyNutritionSummary,
): string[] {
  if (summary.trackedDayCount === 0) return [];

  const observations = [
    summary.trackedDayCount === summary.days.length
      ? `Food was logged on all ${summary.days.length} days.`
      : `Food was logged on ${summary.trackedDayCount} of the last ${summary.days.length} days.`,
  ];

  if (summary.trackedDayCount === 1) {
    observations.push(
      `The tracked day contained ${formatCalories(summary.averages.calories)} kcal.`,
      'More tracked days are needed before comparing calorie patterns.',
    );
    return observations;
  }

  observations.push(
    `Your tracked-day calorie average was ${formatCalories(summary.averages.calories)} kcal.`,
  );

  if (summary.highestCalorieDay) {
    observations.push(
      `Your highest logged calorie day was ${formatWeekday(summary.highestCalorieDay.dateKey)} at ${formatCalories(summary.highestCalorieDay.calories)} kcal.`,
    );
  }

  if (summary.variationBand && summary.calorieRange !== null) {
    observations.push(
      `Logged calories showed ${summary.variationBand} variation across tracked days, with a ${formatCalories(summary.calorieRange)} kcal range.`,
    );
  }

  return observations.slice(0, 4);
}
