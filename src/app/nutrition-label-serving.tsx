import { useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { BackButton } from '@/components/back-button';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { FormInput } from '@/components/form-input';
import { NutritionCard } from '@/components/nutrition-card';
import { ScreenContainer } from '@/components/screen-container';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useNutritionLabelScan } from '@/context/nutrition-label-scan';
import {
  FoodLogNotSignedInError,
  saveNutritionLabelFoodLog,
} from '@/services/food-logs';
import {
  MEAL_TYPES,
  type ConsumedNutrition,
  type OptionalNutritionValue,
} from '@/types/food-log';
import type {
  NutritionLabelServingErrors,
  NutritionLabelServingFormValues,
} from '@/types/nutrition-label';
import { parseNutritionDecimal } from '@/utils/manual-food-validation';
import {
  toNutritionLabelFoodLogInput,
  validateNutritionLabelServing,
} from '@/utils/nutrition-label-validation';
import { calculateConsumedNutrition } from '@/utils/serving-calculations';

const QUICK_SERVINGS = ['0.5', '1', '1.5', '2'] as const;

type DisplayNutrition = {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  sugar: OptionalNutritionValue;
  sodium: OptionalNutritionValue;
  fiber: OptionalNutritionValue;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

function NutritionValues({ values }: { values: DisplayNutrition | ConsumedNutrition }) {
  return (
    <View style={styles.metrics}>
      <View style={styles.metric}>
        <Text style={styles.metricValue}>{formatNumber(values.calories)}</Text>
        <Text style={styles.metricLabel}>kcal</Text>
      </View>
      <View style={styles.metric}>
        <Text style={styles.metricValue}>{formatNumber(values.protein)}</Text>
        <Text style={styles.metricLabel}>g protein</Text>
      </View>
      <View style={styles.metric}>
        <Text style={styles.metricValue}>{formatNumber(values.carbohydrates)}</Text>
        <Text style={styles.metricLabel}>g carbohydrates</Text>
      </View>
      <View style={styles.metric}>
        <Text style={styles.metricValue}>{formatNumber(values.fat)}</Text>
        <Text style={styles.metricLabel}>g fat</Text>
      </View>
      <Text style={styles.optionalValues}>
        Sugar: {values.sugar === null ? 'unknown' : `${formatNumber(values.sugar)} g`} · Sodium:{' '}
        {values.sodium === null ? 'unknown' : `${formatNumber(values.sodium)} mg`} · Fiber:{' '}
        {values.fiber === null ? 'unknown' : `${formatNumber(values.fiber)} g`}
      </Text>
    </View>
  );
}

export default function NutritionLabelServingScreen() {
  const { width } = useWindowDimensions();
  const { reset, reviewedNutrition } = useNutritionLabelScan();
  const [values, setValues] = useState<NutritionLabelServingFormValues>({
    servingsConsumed: '1',
    mealType: 'Breakfast',
  });
  const [errors, setErrors] = useState<NutritionLabelServingErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const wide = width >= 640;

  const preview = useMemo(() => {
    if (!reviewedNutrition) return null;
    const servings = parseNutritionDecimal(values.servingsConsumed);
    if (servings === null || servings <= 0) return null;
    return calculateConsumedNutrition(reviewedNutrition.nutritionPerServing, servings);
  }, [reviewedNutrition, values.servingsConsumed]);

  function updateField<K extends keyof NutritionLabelServingFormValues>(
    field: K,
    value: NutritionLabelServingFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSaveError(null);
    setNeedsLogin(false);
  }

  function cancelFlow() {
    reset();
    router.replace('/add-food');
  }

  function enterManually() {
    reset();
    router.replace('/manual-food-entry');
  }

  async function saveFood() {
    if (!reviewedNutrition || savingRef.current) return;

    const nextErrors = validateNutritionLabelServing(values);
    setErrors(nextErrors);
    setSaveError(null);
    setNeedsLogin(false);
    if (Object.keys(nextErrors).length > 0) return;

    const input = toNutritionLabelFoodLogInput(reviewedNutrition, values);
    if (!input) {
      setSaveError('Review the serving amount and meal, then try again.');
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      await saveNutritionLabelFoodLog(input);
      reset();
      router.replace('/home');
    } catch (error) {
      if (error instanceof FoodLogNotSignedInError) {
        setNeedsLogin(true);
        setSaveError('Please log in before adding food.');
      } else {
        setSaveError("We couldn't save this food. Check your connection and try again.");
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (!reviewedNutrition) {
    return (
      <ScreenContainer width="form" contentStyle={styles.emptyContent}>
        <BackButton
          accessibilityLabel="Back to Nutrition review"
          onPress={() => router.replace('/review-nutrition-label')}
        />
        <NutritionCard
          title="No reviewed label found"
          subtitle="Review the label values before choosing a serving and meal.">
          <View style={styles.emptyActions}>
            <PrimaryButton
              label="Review Nutrition"
              onPress={() => router.replace('/review-nutrition-label')}
            />
            <SecondaryButton label="Enter Manually" onPress={enterManually} />
          </View>
        </NutritionCard>
      </ScreenContainer>
    );
  }

  const perServing: DisplayNutrition = {
    calories: reviewedNutrition.nutritionPerServing.caloriesPerServing,
    protein: reviewedNutrition.nutritionPerServing.proteinPerServing,
    carbohydrates: reviewedNutrition.nutritionPerServing.carbohydratesPerServing,
    fat: reviewedNutrition.nutritionPerServing.fatPerServing,
    sugar: reviewedNutrition.nutritionPerServing.sugarPerServing,
    sodium: reviewedNutrition.nutritionPerServing.sodiumPerServing,
    fiber: reviewedNutrition.nutritionPerServing.fiberPerServing,
  };

  return (
    <ScreenContainer width="page" contentStyle={styles.content}>
      <BackButton
        accessibilityLabel="Back to Nutrition review"
        onPress={() => router.replace('/review-nutrition-label')}
      />
      <AppHeader
        title="Serving & Meal"
        subtitle={`${reviewedNutrition.foodName} · ${reviewedNutrition.servingSize} per serving`}
      />

      <View style={styles.formShell}>
        <NutritionCard title="Meal category" subtitle="Where should this food be counted?">
          <View style={styles.mealChoices}>
            {MEAL_TYPES.map((mealType) => {
              const selected = values.mealType === mealType;
              return (
                <Pressable
                  accessibilityLabel={`${mealType} meal category`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: saving, selected }}
                  disabled={saving}
                  key={mealType}
                  onPress={() => updateField('mealType', mealType)}
                  style={({ pressed }) => [
                    styles.mealChoice,
                    wide && styles.mealChoiceWide,
                    selected && styles.choiceSelected,
                    errors.mealType && styles.choiceError,
                    pressed && styles.choicePressed,
                  ]}>
                  <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
                    {mealType}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {errors.mealType ? <Text style={styles.fieldError}>{errors.mealType}</Text> : null}
        </NutritionCard>

        <NutritionCard
          title="Servings consumed"
          subtitle="The app—not AI—calculates totals from this amount.">
          <View style={styles.servingFields}>
            <View style={styles.quickChoices}>
              {QUICK_SERVINGS.map((serving) => {
                const selected = Number(values.servingsConsumed) === Number(serving);
                return (
                  <Pressable
                    accessibilityLabel={`${serving} servings`}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: saving, selected }}
                    disabled={saving}
                    key={serving}
                    onPress={() => updateField('servingsConsumed', serving)}
                    style={({ pressed }) => [
                      styles.quickChoice,
                      selected && styles.choiceSelected,
                      errors.servingsConsumed && styles.choiceError,
                      pressed && styles.choicePressed,
                    ]}>
                    <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
                      {serving}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <FormInput
              accessibilityHint="Enter a positive decimal number of servings"
              editable={!saving}
              error={errors.servingsConsumed}
              inputMode="decimal"
              keyboardType="decimal-pad"
              label="Custom amount"
              maxLength={10}
              onChangeText={(value) => updateField('servingsConsumed', value)}
              placeholder="e.g. 1.5"
              value={values.servingsConsumed}
            />
          </View>
        </NutritionCard>

        <NutritionCard title="Nutrition total" subtitle="Per serving compared with the amount consumed.">
          <View style={styles.previewGroups}>
            <View style={styles.previewGroup}>
              <Text style={styles.previewTitle}>Per serving</Text>
              <NutritionValues values={perServing} />
            </View>
            <View style={styles.divider} />
            <View style={styles.previewGroup}>
              <Text style={styles.previewTitle}>
                {preview
                  ? `${values.servingsConsumed} ${Number(values.servingsConsumed) === 1 ? 'serving' : 'servings'}`
                  : 'Consumed total'}
              </Text>
              {preview ? (
                <NutritionValues values={preview} />
              ) : (
                <Text style={styles.previewEmpty}>Enter a valid serving amount to see totals.</Text>
              )}
            </View>
          </View>
        </NutritionCard>

        {saveError ? (
          <View accessibilityLiveRegion="polite" style={styles.errorCard}>
            <Text style={styles.errorText}>{saveError}</Text>
            {needsLogin ? (
              <SecondaryButton label="Go to Log In" onPress={() => router.replace('/login')} />
            ) : null}
          </View>
        ) : null}

        <View style={styles.actions}>
          <PrimaryButton
            label={saving ? 'Adding Food...' : 'Add Food'}
            loading={saving}
            onPress={() => void saveFood()}
          />
          <SecondaryButton disabled={saving} label="Enter Manually" onPress={enterManually} />
          <SecondaryButton disabled={saving} label="Cancel" onPress={cancelFlow} />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.xl,
    paddingBottom: Spacing.section,
  },
  emptyContent: {
    gap: Spacing.xl,
  },
  emptyActions: {
    gap: Spacing.md,
  },
  formShell: {
    alignSelf: 'center',
    gap: Spacing.lg,
    maxWidth: 640,
    width: '100%',
  },
  mealChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  mealChoice: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radii.pill,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 0,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  mealChoiceWide: {
    flexBasis: '22%',
  },
  servingFields: {
    gap: Spacing.lg,
  },
  quickChoices: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickChoice: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radii.pill,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 0,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  choiceSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.primary,
  },
  choiceError: {
    borderColor: Colors.error,
  },
  choicePressed: {
    opacity: 0.78,
  },
  choiceText: {
    color: Colors.text,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
    textAlign: 'center',
  },
  choiceTextSelected: {
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
  },
  fieldError: {
    color: Colors.error,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
    marginTop: Spacing.sm,
  },
  previewGroups: {
    gap: Spacing.lg,
  },
  previewGroup: {
    gap: Spacing.md,
  },
  previewTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.body,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  metric: {
    backgroundColor: Colors.background,
    borderRadius: Radii.input,
    flexBasis: '45%',
    flexGrow: 1,
    minWidth: 0,
    padding: Spacing.md,
  },
  metricValue: {
    color: Colors.primary,
    fontSize: Typography.sizes.section,
    fontWeight: Typography.weights.heavy,
    lineHeight: Typography.lineHeights.section,
  },
  metricLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
  },
  optionalValues: {
    color: Colors.textMuted,
    flexBasis: '100%',
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
  },
  divider: {
    backgroundColor: Colors.border,
    height: 1,
  },
  previewEmpty: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
  },
  errorCard: {
    backgroundColor: '#FCEAEA',
    borderColor: '#F2C7C7',
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
  },
  actions: {
    gap: Spacing.md,
  },
});
