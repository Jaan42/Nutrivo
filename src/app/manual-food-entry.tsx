import { useMemo, useState } from 'react';
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
  MEAL_TYPES,
  type ConsumedNutrition,
  type ManualFoodFormValues,
  type ManualFoodValidationErrors,
  type MealType,
  type OptionalNutritionValue,
  type PerServingNutrition,
} from '@/types/food-log';
import {
  parseManualFoodForm,
  parseManualFoodPreview,
  validateManualFoodForm,
} from '@/utils/manual-food-validation';
import { calculateConsumedNutrition } from '@/utils/serving-calculations';

const QUICK_SERVINGS = ['0.5', '1', '1.5', '2'] as const;

const EMPTY_FORM: ManualFoodFormValues = {
  foodName: '',
  servingSize: '',
  caloriesPerServing: '',
  proteinPerServing: '',
  carbohydratesPerServing: '',
  fatPerServing: '',
  sugarPerServing: '',
  sodiumPerServing: '',
  fiberPerServing: '',
  servingsConsumed: '1',
  mealType: 'Breakfast',
};

type NutritionField =
  | 'caloriesPerServing'
  | 'proteinPerServing'
  | 'carbohydratesPerServing'
  | 'fatPerServing'
  | 'sugarPerServing'
  | 'sodiumPerServing'
  | 'fiberPerServing';

const NUTRITION_FIELDS: readonly {
  field: NutritionField;
  label: string;
  placeholder: string;
  accessibilityHint: string;
}[] = [
  {
    field: 'caloriesPerServing',
    label: 'Calories',
    placeholder: 'e.g. 220',
    accessibilityHint: 'Enter calories in one serving',
  },
  {
    field: 'proteinPerServing',
    label: 'Protein (g)',
    placeholder: 'e.g. 40',
    accessibilityHint: 'Enter protein grams in one serving',
  },
  {
    field: 'carbohydratesPerServing',
    label: 'Carbohydrates (g)',
    placeholder: 'e.g. 0',
    accessibilityHint: 'Enter carbohydrate grams in one serving',
  },
  {
    field: 'fatPerServing',
    label: 'Fat (g)',
    placeholder: 'e.g. 6',
    accessibilityHint: 'Enter fat grams in one serving',
  },
  {
    field: 'sugarPerServing',
    label: 'Sugar (g) · optional',
    placeholder: 'Optional',
    accessibilityHint: 'Optionally enter sugar grams in one serving',
  },
  {
    field: 'sodiumPerServing',
    label: 'Sodium (mg) · optional',
    placeholder: 'Optional',
    accessibilityHint: 'Optionally enter sodium milligrams in one serving',
  },
  {
    field: 'fiberPerServing',
    label: 'Fiber (g) · optional',
    placeholder: 'Optional',
    accessibilityHint: 'Optionally enter fiber grams in one serving',
  },
];

type PreviewValues = {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  sugar: OptionalNutritionValue;
  sodium: OptionalNutritionValue;
  fiber: OptionalNutritionValue;
};

function formatPreviewNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

function perServingPreview(nutrition: PerServingNutrition): PreviewValues {
  return {
    calories: nutrition.caloriesPerServing,
    protein: nutrition.proteinPerServing,
    carbohydrates: nutrition.carbohydratesPerServing,
    fat: nutrition.fatPerServing,
    sugar: nutrition.sugarPerServing,
    sodium: nutrition.sodiumPerServing,
    fiber: nutrition.fiberPerServing,
  };
}

function NutritionPreviewValues({ values }: { values: PreviewValues | ConsumedNutrition }) {
  const hasOptionalValues =
    values.sugar !== null || values.sodium !== null || values.fiber !== null;

  return (
    <View style={styles.previewValues}>
      <View style={styles.previewMetric}>
        <Text style={styles.previewMetricValue}>{formatPreviewNumber(values.calories)}</Text>
        <Text style={styles.previewMetricLabel}>kcal</Text>
      </View>
      <View style={styles.previewMetric}>
        <Text style={styles.previewMetricValue}>{formatPreviewNumber(values.protein)}</Text>
        <Text style={styles.previewMetricLabel}>g protein</Text>
      </View>
      <View style={styles.previewMetric}>
        <Text style={styles.previewMetricValue}>
          {formatPreviewNumber(values.carbohydrates)}
        </Text>
        <Text style={styles.previewMetricLabel}>g carbohydrates</Text>
      </View>
      <View style={styles.previewMetric}>
        <Text style={styles.previewMetricValue}>{formatPreviewNumber(values.fat)}</Text>
        <Text style={styles.previewMetricLabel}>g fat</Text>
      </View>
      {hasOptionalValues ? (
        <Text style={styles.optionalPreview}>
          {values.sugar !== null ? `${formatPreviewNumber(values.sugar)} g sugar` : null}
          {values.sugar !== null && (values.sodium !== null || values.fiber !== null) ? ' · ' : null}
          {values.sodium !== null ? `${formatPreviewNumber(values.sodium)} mg sodium` : null}
          {values.sodium !== null && values.fiber !== null ? ' · ' : null}
          {values.fiber !== null ? `${formatPreviewNumber(values.fiber)} g fiber` : null}
        </Text>
      ) : null}
    </View>
  );
}

type MealSelectorProps = {
  value: MealType | null;
  error?: string;
  disabled?: boolean;
  wide: boolean;
  onChange: (mealType: MealType) => void;
};

function MealSelector({ value, error, disabled = false, wide, onChange }: MealSelectorProps) {
  return (
    <View style={styles.selectionGroup}>
      <View style={styles.mealChoices}>
        {MEAL_TYPES.map((mealType) => {
          const selected = value === mealType;
          return (
            <Pressable
              accessibilityLabel={`${mealType} meal category`}
              accessibilityRole="button"
              accessibilityState={{ disabled, selected }}
              disabled={disabled}
              key={mealType}
              onPress={() => onChange(mealType)}
              style={({ pressed }) => [
                styles.mealChoice,
                wide && styles.mealChoiceWide,
                selected && styles.choiceSelected,
                error && styles.choiceError,
                pressed && styles.choicePressed,
              ]}>
              <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
                {mealType}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export default function ManualFoodEntryScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 640;
  const { clearPendingFoodEntry, stageFoodEntry } = useNutritionLabelScan();
  const [values, setValues] = useState<ManualFoodFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<ManualFoodValidationErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const preview = useMemo(() => {
    const previewInput = parseManualFoodPreview(values);
    if (!previewInput) return null;

    return {
      ...previewInput,
      consumed: calculateConsumedNutrition(
        previewInput.nutritionPerServing,
        previewInput.servingsConsumed,
      ),
    };
  }, [values]);

  function updateField<K extends keyof ManualFoodFormValues>(
    field: K,
    value: ManualFoodFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
    clearPendingFoodEntry();
  }

  function continueToInsight() {
    const nextErrors = validateManualFoodForm(values);
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    const parsedFood = parseManualFoodForm(values);
    if (!parsedFood) {
      setFormError('Please review the food details and try again.');
      return;
    }

    try {
      stageFoodEntry(parsedFood, 'manual');
      router.push('/nutrition-insight');
    } catch {
      setFormError('We could not calculate this serving. Review the nutrition values.');
    }
  }

  function cancelEntry() {
    clearPendingFoodEntry();
    router.replace('/add-food');
  }

  return (
    <ScreenContainer width="page" contentStyle={styles.content}>
      <BackButton
        accessibilityLabel="Back to Add Food"
        onPress={() => router.replace('/add-food')}
      />
      <AppHeader
        title="Enter Food Manually"
        subtitle="Nutrition values should be entered for one serving."
      />

      <View style={styles.formShell}>
        <NutritionCard title="Food details">
          <View style={styles.cardFields}>
            <FormInput
              accessibilityHint="Enter the name of the food"
              autoCapitalize="words"
              error={errors.foodName}
              label="Food Name"
              maxLength={100}
              onChangeText={(value) => updateField('foodName', value)}
              placeholder="e.g. Chicken Breast"
              value={values.foodName}
            />
            <FormInput
              accessibilityHint="Describe one serving, such as one piece or one cup"
              error={errors.servingSize}
              label="Serving Size"
              maxLength={60}
              onChangeText={(value) => updateField('servingSize', value)}
              placeholder="e.g. 1 piece, 1 cup, 100 g"
              value={values.servingSize}
            />
          </View>
        </NutritionCard>

        <NutritionCard
          title="Nutrition per serving"
          subtitle="Required values first, followed by optional nutrients">
          <View style={[styles.nutritionGrid, wide && styles.nutritionGridWide]}>
            {NUTRITION_FIELDS.map(({ field, label, placeholder, accessibilityHint }) => (
              <View
                key={field}
                style={[styles.nutritionField, wide && styles.nutritionFieldWide]}>
                <FormInput
                  accessibilityHint={accessibilityHint}
                  error={errors[field]}
                  inputMode="decimal"
                  keyboardType="decimal-pad"
                  label={label}
                  maxLength={12}
                  onChangeText={(value) => updateField(field, value)}
                  placeholder={placeholder}
                  value={values[field]}
                />
              </View>
            ))}
          </View>
        </NutritionCard>

        <NutritionCard title="Meal category" subtitle="Where should this food be counted?">
          <MealSelector
            error={errors.mealType}
            onChange={(mealType) => updateField('mealType', mealType)}
            value={values.mealType}
            wide={wide}
          />
        </NutritionCard>

        <NutritionCard
          title="Servings consumed"
          subtitle="Choose a common amount or enter your own decimal value">
          <View style={styles.cardFields}>
            <View style={styles.quickChoices}>
              {QUICK_SERVINGS.map((serving) => {
                const selected = Number(values.servingsConsumed) === Number(serving);
                return (
                  <Pressable
                    accessibilityHint="Sets the servings consumed"
                    accessibilityLabel={`${serving} servings`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
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
              error={errors.servingsConsumed}
              inputMode="decimal"
              keyboardType="decimal-pad"
              label="Custom amount"
              maxLength={10}
              onChangeText={(value) => updateField('servingsConsumed', value)}
              placeholder="e.g. 1.25"
              value={values.servingsConsumed}
            />
          </View>
        </NutritionCard>

        <NutritionCard
          title="Serving preview"
          subtitle="Calculated automatically from the values above">
          {preview ? (
            <View style={styles.previewGroups}>
              <View style={styles.previewGroup}>
                <Text style={styles.previewTitle}>Per serving</Text>
                <NutritionPreviewValues values={perServingPreview(preview.nutritionPerServing)} />
              </View>
              <View style={styles.previewDivider} />
              <View style={styles.previewGroup}>
                <Text style={styles.previewTitle}>
                  {formatPreviewNumber(preview.servingsConsumed)}{' '}
                  {preview.servingsConsumed === 1 ? 'serving' : 'servings'}
                </Text>
                <NutritionPreviewValues values={preview.consumed} />
              </View>
            </View>
          ) : (
            <Text style={styles.previewEmpty}>
              Enter valid per-serving nutrition and a serving amount to see the calculated total.
            </Text>
          )}
        </NutritionCard>

        {formError ? (
          <View accessibilityLiveRegion="polite" style={styles.saveErrorCard}>
            <Text style={styles.saveErrorText}>{formError}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <SecondaryButton label="Cancel" onPress={cancelEntry} />
          <PrimaryButton
            label="Continue to Nutrition Insight"
            onPress={continueToInsight}
          />
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
  formShell: {
    alignSelf: 'center',
    gap: Spacing.lg,
    maxWidth: 640,
    width: '100%',
  },
  cardFields: {
    gap: Spacing.lg,
  },
  nutritionGrid: {
    gap: Spacing.lg,
  },
  nutritionGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  nutritionField: {
    minWidth: 0,
    width: '100%',
  },
  nutritionFieldWide: {
    flexBasis: '47%',
    flexGrow: 1,
    width: 'auto',
  },
  selectionGroup: {
    gap: Spacing.sm,
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
  previewValues: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  previewMetric: {
    backgroundColor: Colors.background,
    borderRadius: Radii.input,
    flexBasis: '45%',
    flexGrow: 1,
    minWidth: 0,
    padding: Spacing.md,
  },
  previewMetricValue: {
    color: Colors.primary,
    fontSize: Typography.sizes.section,
    fontWeight: Typography.weights.heavy,
    lineHeight: Typography.lineHeights.section,
  },
  previewMetricLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
  },
  optionalPreview: {
    color: Colors.textMuted,
    flexBasis: '100%',
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
  },
  previewDivider: {
    backgroundColor: Colors.border,
    height: 1,
  },
  previewEmpty: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
  },
  saveErrorCard: {
    alignItems: 'stretch',
    backgroundColor: '#FCEAEA',
    borderColor: '#F2C7C7',
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  saveErrorText: {
    color: Colors.error,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.md,
  },
});
