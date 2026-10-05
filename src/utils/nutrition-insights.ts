import type { ConsumedNutrition } from '@/types/food-log';

export type NutritionInsightBand = 'lower' | 'moderate' | 'higher';

export type NutritionInsight = {
  nutrient: 'protein' | 'carbohydrates' | 'fat' | 'sugar' | 'sodium' | 'fiber';
  title: string;
  message: string;
  band: NutritionInsightBand;
};

type PresentationThreshold = {
  moderateFrom: number;
  higherFrom: number;
};

const MAX_INSIGHT_OBSERVATIONS = 3;

const BAND_PRIORITY: Record<NutritionInsightBand, number> = {
  higher: 3,
  moderate: 2,
  lower: 1,
};

const NUTRIENT_PRIORITY: Record<NutritionInsight['nutrient'], number> = {
  fiber: 6,
  protein: 5,
  sodium: 4,
  carbohydrates: 3,
  fat: 2,
  sugar: 1,
};

const USEFUL_LOWER_NUTRIENTS = new Set<NutritionInsight['nutrient']>([
  'fat',
  'sodium',
  'sugar',
]);

/**
 * UI-only bands for describing the amount in one food entry. These are deliberately
 * simple presentation thresholds, not dietary limits or guidance.
 * Protein/carbohydrates/fat/sugar/fiber are grams; sodium is milligrams.
 */
export const NUTRITION_INSIGHT_THRESHOLDS = {
  protein: { moderateFrom: 10, higherFrom: 25 },
  carbohydrates: { moderateFrom: 30, higherFrom: 60 },
  fat: { moderateFrom: 10, higherFrom: 20 },
  sugar: { moderateFrom: 5, higherFrom: 15 },
  sodium: { moderateFrom: 200, higherFrom: 600 },
  fiber: { moderateFrom: 3, higherFrom: 7 },
} as const satisfies Record<NutritionInsight['nutrient'], PresentationThreshold>;

export type DailyNutritionTargets = {
  calorieTarget: number | null;
  proteinTarget: number | null;
  carbohydrateTarget: number | null;
  fatTarget: number | null;
};

export type TargetContribution = {
  nutrient: 'calories' | 'protein' | 'carbohydrates' | 'fat';
  label: string;
  consumed: number;
  target: number;
  unit: 'kcal' | 'g';
  percentage: number;
  visualProgress: number;
};

function getBand(value: number, threshold: PresentationThreshold): NutritionInsightBand {
  if (value >= threshold.higherFrom) return 'higher';
  if (value >= threshold.moderateFrom) return 'moderate';
  return 'lower';
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function insightTitle(
  nutrient: NutritionInsight['nutrient'],
  band: NutritionInsightBand,
): string {
  const level = capitalize(band);

  switch (nutrient) {
    case 'protein':
      return `${level} protein contribution`;
    case 'carbohydrates':
      return `${level} carbohydrates`;
    case 'fat':
      return `${level} fat contribution`;
    case 'fiber':
      return `${level} fiber amount`;
    case 'sodium':
      return band === 'higher' ? 'Notable sodium amount' : `${level} sodium`;
    case 'sugar':
      return `${level} sugar amount`;
  }
}

function insightMessage(
  nutrient: NutritionInsight['nutrient'],
  value: number,
  band: NutritionInsightBand,
): string {
  const amount = formatAmount(value);

  switch (nutrient) {
    case 'protein':
      return `This entry provides ${amount} g of protein.`;
    case 'carbohydrates':
      return `This entry contains ${amount} g of carbohydrates.`;
    case 'fat':
      return `This entry contains ${amount} g of fat.`;
    case 'fiber':
      return band === 'higher'
        ? `Fiber stands out at ${amount} g in this entry.`
        : `This entry provides ${amount} g of fiber.`;
    case 'sodium':
      return `This entry contains ${amount} mg of sodium.`;
    case 'sugar':
      return `This entry contains ${amount} g of sugar.`;
  }
}

function createInsight(
  nutrient: NutritionInsight['nutrient'],
  value: number,
): NutritionInsight {
  const band = getBand(value, NUTRITION_INSIGHT_THRESHOLDS[nutrient]);
  return {
    nutrient,
    title: insightTitle(nutrient, band),
    message: insightMessage(nutrient, value, band),
    band,
  };
}

function compareInsights(left: NutritionInsight, right: NutritionInsight): number {
  const bandDifference = BAND_PRIORITY[right.band] - BAND_PRIORITY[left.band];
  if (bandDifference !== 0) return bandDifference;
  return NUTRIENT_PRIORITY[right.nutrient] - NUTRIENT_PRIORITY[left.nutrient];
}

/**
 * Selects a concise set of observations from already-calculated consumed values.
 * Higher bands rank first, then moderate bands. Lower bands are included selectively
 * and serve as fallbacks when fewer than three stronger observations are available.
 */
export function createNutritionInsights(nutrition: ConsumedNutrition): NutritionInsight[] {
  const candidates = [
    createInsight('protein', nutrition.protein),
    createInsight('carbohydrates', nutrition.carbohydrates),
    createInsight('fat', nutrition.fat),
  ];

  if (nutrition.sugar !== null) {
    candidates.push(createInsight('sugar', nutrition.sugar));
  }
  if (nutrition.sodium !== null) {
    candidates.push(createInsight('sodium', nutrition.sodium));
  }
  if (nutrition.fiber !== null) {
    candidates.push(createInsight('fiber', nutrition.fiber));
  }

  const prioritized = candidates
    .filter(
      (insight) =>
        insight.band !== 'lower' || USEFUL_LOWER_NUTRIENTS.has(insight.nutrient),
    )
    .sort(compareInsights);
  const prioritizedNutrients = new Set(prioritized.map((insight) => insight.nutrient));
  const fallback = candidates
    .filter((insight) => !prioritizedNutrients.has(insight.nutrient))
    .sort(compareInsights);

  const selected = prioritized.slice(0, MAX_INSIGHT_OBSERVATIONS);
  const minimumObservationCount = Math.min(2, candidates.length);

  if (selected.length < minimumObservationCount) {
    selected.push(...fallback.slice(0, minimumObservationCount - selected.length));
  }

  return selected;
}

/** Returns null when a target cannot safely be used as a denominator. */
export function calculateTargetPercentage(
  consumed: number,
  target: number | null | undefined,
): number | null {
  if (
    !Number.isFinite(consumed) ||
    consumed < 0 ||
    typeof target !== 'number' ||
    !Number.isFinite(target) ||
    target <= 0
  ) {
    return null;
  }

  const rawPercentage = (consumed / target) * 100;
  if (!Number.isFinite(rawPercentage)) return null;

  return Math.round(rawPercentage * 10) / 10;
}

function targetContribution(
  nutrient: TargetContribution['nutrient'],
  label: string,
  consumed: number,
  target: number | null,
  unit: TargetContribution['unit'],
): TargetContribution | null {
  const percentage = calculateTargetPercentage(consumed, target);
  if (percentage === null || target === null) return null;

  return {
    nutrient,
    label,
    consumed,
    target,
    unit,
    percentage,
    visualProgress: Math.min(1, Math.max(0, percentage / 100)),
  };
}

/** Display percentages may exceed 100%; only visual progress is clamped. */
export function createTargetContributions(
  nutrition: ConsumedNutrition,
  targets: DailyNutritionTargets,
): TargetContribution[] {
  const contributions = [
    targetContribution('calories', 'Calories', nutrition.calories, targets.calorieTarget, 'kcal'),
    targetContribution('protein', 'Protein', nutrition.protein, targets.proteinTarget, 'g'),
    targetContribution(
      'carbohydrates',
      'Carbohydrates',
      nutrition.carbohydrates,
      targets.carbohydrateTarget,
      'g',
    ),
    targetContribution('fat', 'Fat', nutrition.fat, targets.fatTarget, 'g'),
  ];

  return contributions.filter((item): item is TargetContribution => item !== null);
}
