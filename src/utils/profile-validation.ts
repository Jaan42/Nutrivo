import {
  ACTIVITY_LEVELS,
  GOALS,
  SEX_OPTIONS,
  type ProfileFormValues,
  type ProfileInput,
  type ProfileValidationErrors,
} from '@/types/nutrition-profile';

// These conservative bounds keep an adult estimate within plausible input ranges.
export const PROFILE_INPUT_LIMITS = {
  age: { min: 18, max: 120 },
  heightCm: { min: 100, max: 250 },
  weightKg: { min: 25, max: 350 },
} as const;

function isChoice<T extends string>(options: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && options.some((option) => option === value);
}

/** Returns messages keyed to fields so each form control can show its own error. */
export function validateProfileForm(
  values: ProfileFormValues,
): ProfileValidationErrors {
  const errors: ProfileValidationErrors = {};
  const ageText = values.age.trim();
  const heightText = values.heightCm.trim();
  const weightText = values.weightKg.trim();

  if (!ageText) {
    errors.age = 'Enter your age.';
  } else if (!/^\d+$/.test(ageText)) {
    errors.age = 'Enter your age as a whole number.';
  } else {
    const age = Number(ageText);
    if (
      !Number.isSafeInteger(age) ||
      age < PROFILE_INPUT_LIMITS.age.min ||
      age > PROFILE_INPUT_LIMITS.age.max
    ) {
      errors.age = 'Enter an age between 18 and 120.';
    }
  }

  if (!isChoice(SEX_OPTIONS, values.sex)) {
    errors.sex = 'Select your sex for the calorie estimate.';
  }

  if (!heightText) {
    errors.heightCm = 'Enter your height.';
  } else if (!/^\d+(?:\.\d+)?$/.test(heightText)) {
    errors.heightCm = 'Enter a valid height in centimeters.';
  } else {
    const heightCm = Number(heightText);
    if (
      !Number.isFinite(heightCm) ||
      heightCm < PROFILE_INPUT_LIMITS.heightCm.min ||
      heightCm > PROFILE_INPUT_LIMITS.heightCm.max
    ) {
      errors.heightCm = 'Enter a height between 100 and 250 cm.';
    }
  }

  if (!weightText) {
    errors.weightKg = 'Enter your weight.';
  } else if (!/^\d+(?:\.\d+)?$/.test(weightText)) {
    errors.weightKg = 'Enter a valid weight in kilograms.';
  } else {
    const weightKg = Number(weightText);
    if (
      !Number.isFinite(weightKg) ||
      weightKg < PROFILE_INPUT_LIMITS.weightKg.min ||
      weightKg > PROFILE_INPUT_LIMITS.weightKg.max
    ) {
      errors.weightKg = 'Enter a weight between 25 and 350 kg.';
    }
  }

  if (!isChoice(ACTIVITY_LEVELS, values.activityLevel)) {
    errors.activityLevel = 'Select your activity level.';
  }

  if (!isChoice(GOALS, values.goal)) {
    errors.goal = 'Select your goal.';
  }

  return errors;
}

/** Converts a validated form into numeric input for the calculation utilities. */
export function parseProfileForm(values: ProfileFormValues): ProfileInput | null {
  if (
    Object.keys(validateProfileForm(values)).length > 0 ||
    values.sex === null ||
    values.activityLevel === null ||
    values.goal === null
  ) {
    return null;
  }

  return {
    age: Number(values.age.trim()),
    sex: values.sex,
    heightCm: Number(values.heightCm.trim()),
    weightKg: Number(values.weightKg.trim()),
    activityLevel: values.activityLevel,
    goal: values.goal,
  };
}

/** Rechecks a profile before showing or saving calculated targets. */
export function validateProfileInput(input: ProfileInput): ProfileValidationErrors {
  return validateProfileForm({
    age: String(input.age),
    sex: isChoice(SEX_OPTIONS, input.sex) ? input.sex : null,
    heightCm: String(input.heightCm),
    weightKg: String(input.weightKg),
    activityLevel: isChoice(ACTIVITY_LEVELS, input.activityLevel)
      ? input.activityLevel
      : null,
    goal: isChoice(GOALS, input.goal) ? input.goal : null,
  });
}
