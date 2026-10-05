import { useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppHeader } from '@/components/app-header';
import { BackButton } from '@/components/back-button';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { FormInput } from '@/components/form-input';
import { NutritionCard } from '@/components/nutrition-card';
import { ScreenContainer } from '@/components/screen-container';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useFoodLog } from '@/hooks/use-food-log';
import { FoodLogNotSignedInError, updateFoodLog } from '@/services/food-logs';
import {
  MEAL_TYPES,
  type FoodLogRecord,
  type ManualFoodFormValues,
  type ManualFoodValidationErrors,
} from '@/types/food-log';
import { formatLocalDateKey } from '@/utils/date';
import {
  parseManualFoodForm,
  parseManualFoodPreview,
  validateManualFoodForm,
} from '@/utils/manual-food-validation';
import { calculateConsumedNutrition } from '@/utils/serving-calculations';

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
}[] = [
  { field: 'caloriesPerServing', label: 'Calories', placeholder: 'e.g. 220' },
  { field: 'proteinPerServing', label: 'Protein (g)', placeholder: 'e.g. 40' },
  {
    field: 'carbohydratesPerServing',
    label: 'Carbohydrates (g)',
    placeholder: 'e.g. 20',
  },
  { field: 'fatPerServing', label: 'Fat (g)', placeholder: 'e.g. 6' },
  { field: 'sugarPerServing', label: 'Sugar (g) · optional', placeholder: 'Optional' },
  { field: 'sodiumPerServing', label: 'Sodium (mg) · optional', placeholder: 'Optional' },
  { field: 'fiberPerServing', label: 'Fiber (g) · optional', placeholder: 'Optional' },
];

function numberText(value: number): string {
  return String(value);
}

function optionalNumberText(value: number | null): string {
  return value === null ? '' : String(value);
}

function formValuesFromFoodLog(foodLog: FoodLogRecord): ManualFoodFormValues {
  return {
    foodName: foodLog.foodName,
    servingSize: foodLog.servingSize,
    caloriesPerServing: numberText(foodLog.caloriesPerServing),
    proteinPerServing: numberText(foodLog.proteinPerServing),
    carbohydratesPerServing: numberText(foodLog.carbohydratesPerServing),
    fatPerServing: numberText(foodLog.fatPerServing),
    sugarPerServing: optionalNumberText(foodLog.sugarPerServing),
    sodiumPerServing: optionalNumberText(foodLog.sodiumPerServing),
    fiberPerServing: optionalNumberText(foodLog.fiberPerServing),
    servingsConsumed: numberText(foodLog.servingsConsumed),
    mealType: foodLog.mealType,
  };
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

function sourceLabel(source: FoodLogRecord['source']): string {
  if (source === 'manual') return 'Manual Entry';
  if (source === 'nutrition-label') return 'Nutrition Label';
  return 'Unknown';
}

function EditFoodForm({ foodLog, wide }: { foodLog: FoodLogRecord; wide: boolean }) {
  const [values, setValues] = useState<ManualFoodFormValues>(() =>
    formValuesFromFoodLog(foodLog),
  );
  const [errors, setErrors] = useState<ManualFoodValidationErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  function returnToDetails() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace({ pathname: '/food-details/[id]', params: { id: foodLog.id } });
    }
  }

  const preview = useMemo(() => {
    const parsedPreview = parseManualFoodPreview(values);
    if (!parsedPreview) return null;

    try {
      return calculateConsumedNutrition(
        parsedPreview.nutritionPerServing,
        parsedPreview.servingsConsumed,
      );
    } catch {
      return null;
    }
  }, [values]);

  function updateField<K extends keyof ManualFoodFormValues>(
    field: K,
    value: ManualFoodFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSaveError(null);
  }

  async function saveChanges() {
    if (savingRef.current) return;

    const nextErrors = validateManualFoodForm(values);
    setErrors(nextErrors);
    setSaveError(null);
    if (Object.keys(nextErrors).length > 0) return;

    const input = parseManualFoodForm(values);
    if (!input) {
      setSaveError('Review the food values and try again.');
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      await updateFoodLog(foodLog.id, input);
      returnToDetails();
    } catch (error) {
      setSaveError(
        error instanceof FoodLogNotSignedInError
          ? 'Please log in again before updating this food.'
          : "We couldn't update this food. Check your connection and try again.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function cancelEdit() {
    returnToDetails();
  }

  return (
    <View style={styles.formShell}>
      <View style={styles.readOnlyNotice}>
        <Text style={styles.readOnlyTitle}>Entry information kept unchanged</Text>
        <Text style={styles.readOnlyText}>
          {sourceLabel(foodLog.source)} · {formatLocalDateKey(foodLog.dateKey)}
        </Text>
      </View>

      <NutritionCard title="Food details">
        <View style={styles.fieldStack}>
          <FormInput
            autoCapitalize="words"
            editable={!saving}
            error={errors.foodName}
            label="Food Name"
            maxLength={100}
            onChangeText={(value) => updateField('foodName', value)}
            placeholder="e.g. Chicken Breast"
            value={values.foodName}
          />
          <FormInput
            editable={!saving}
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
        subtitle="Consumed totals are recalculated automatically.">
        <View style={[styles.nutritionGrid, wide && styles.nutritionGridWide]}>
          {NUTRITION_FIELDS.map(({ field, label, placeholder }) => (
            <View
              key={field}
              style={[styles.nutritionField, wide && styles.nutritionFieldWide]}>
              <FormInput
                editable={!saving}
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

      <NutritionCard title="Meal category">
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
                  selected && styles.mealChoiceSelected,
                  errors.mealType && styles.mealChoiceError,
                  pressed && styles.mealChoicePressed,
                ]}>
                <Text
                  style={[
                    styles.mealChoiceText,
                    selected && styles.mealChoiceTextSelected,
                  ]}>
                  {mealType}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {errors.mealType ? <Text style={styles.fieldError}>{errors.mealType}</Text> : null}
      </NutritionCard>

      <NutritionCard title="Servings consumed">
        <FormInput
          editable={!saving}
          error={errors.servingsConsumed}
          inputMode="decimal"
          keyboardType="decimal-pad"
          label="Number of servings"
          maxLength={10}
          onChangeText={(value) => updateField('servingsConsumed', value)}
          placeholder="e.g. 1.5"
          value={values.servingsConsumed}
        />
      </NutritionCard>

      <NutritionCard
        title="Updated consumed totals"
        subtitle="Preview calculated from the edited values.">
        {preview ? (
          <View style={[styles.previewGrid, wide && styles.previewGridWide]}>
            {[
              ['Calories', preview.calories, 'kcal'],
              ['Protein', preview.protein, 'g'],
              ['Carbohydrates', preview.carbohydrates, 'g'],
              ['Fat', preview.fat, 'g'],
            ].map(([label, value, unit]) => (
              <View
                key={String(label)}
                style={[styles.previewItem, wide && styles.previewItemWide]}>
                <Text style={styles.previewLabel}>{label}</Text>
                <Text style={styles.previewValue}>
                  {formatNumber(Number(value))} {unit}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.previewUnavailable}>
            Enter valid nutrition values and a serving amount to preview totals.
          </Text>
        )}
      </NutritionCard>

      {saveError ? (
        <View accessibilityLiveRegion="polite" style={styles.errorCard}>
          <Text style={styles.errorText}>{saveError}</Text>
        </View>
      ) : null}

      <View style={[styles.actions, wide && styles.actionsWide]}>
        <SecondaryButton
          disabled={saving}
          label="Cancel"
          onPress={cancelEdit}
          style={wide ? styles.actionButton : undefined}
        />
        <PrimaryButton
          label={saving ? 'Saving Changes...' : 'Save Changes'}
          loading={saving}
          onPress={() => void saveChanges()}
          style={wide ? styles.actionButton : undefined}
        />
      </View>
    </View>
  );
}

export default function EditFoodScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 680;
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const foodLogId = Array.isArray(params.id) ? params.id[0] : params.id ?? null;
  const foodLogState = useFoodLog(foodLogId);
  const loading =
    foodLogState.authLoading ||
    (foodLogState.user !== null && foodLogState.foodLogLoading);

  function goToDetails() {
    if (foodLogId) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace({ pathname: '/food-details/[id]', params: { id: foodLogId } });
      }
    } else {
      router.replace('/history');
    }
  }

  if (loading) {
    return (
      <ScreenContainer width="page" contentStyle={styles.centeredState}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.stateTitle}>Loading food editor</Text>
      </ScreenContainer>
    );
  }

  if (!foodLogState.user) {
    return (
      <ScreenContainer width="form" contentStyle={styles.centeredState}>
        <Text style={styles.stateTitle}>
          {foodLogState.authError ? 'Session unavailable' : 'Log in to edit this food'}
        </Text>
        <Text style={styles.stateMessage}>
          {foodLogState.authError ?? 'Food entries are tied to your Nutrivo account.'}
        </Text>
        <PrimaryButton label="Go to Log In" onPress={() => router.replace('/login')} />
      </ScreenContainer>
    );
  }

  if (!foodLogState.foodLog) {
    return (
      <ScreenContainer width="form" contentStyle={styles.emptyContent}>
        <BackButton accessibilityLabel="Back to Food Details" onPress={goToDetails} />
        <NutritionCard
          title={foodLogState.foodLogError ? 'Food editor unavailable' : 'Food entry not found'}
          subtitle={
            foodLogState.foodLogError ??
            'This food may have been deleted or the link is no longer available.'
          }>
          <PrimaryButton label="Return to History" onPress={() => router.replace('/history')} />
        </NutritionCard>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer width="page" contentStyle={styles.content}>
      <BackButton accessibilityLabel="Back to Food Details" onPress={goToDetails} />
      <AppHeader
        title="Edit Food"
        subtitle="Update per-serving values, servings, or meal placement."
      />
      <EditFoodForm foodLog={foodLogState.foodLog} key={foodLogState.foodLog.id} wide={wide} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.xl,
    paddingBottom: Spacing.section,
  },
  centeredState: {
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.md,
    justifyContent: 'center',
  },
  emptyContent: {
    gap: Spacing.xl,
  },
  stateTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.section,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.section,
    textAlign: 'center',
  },
  stateMessage: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.lineHeights.body,
    textAlign: 'center',
  },
  formShell: {
    alignSelf: 'center',
    gap: Spacing.lg,
    maxWidth: 680,
    width: '100%',
  },
  readOnlyNotice: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accentStrong,
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: Spacing.xs,
    padding: Spacing.lg,
  },
  readOnlyTitle: {
    color: Colors.primary,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.body,
  },
  readOnlyText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
  },
  fieldStack: {
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
  mealChoiceSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.primary,
  },
  mealChoiceError: {
    borderColor: Colors.error,
  },
  mealChoicePressed: {
    opacity: 0.78,
  },
  mealChoiceText: {
    color: Colors.text,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
  },
  mealChoiceTextSelected: {
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
  },
  fieldError: {
    color: Colors.error,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
    marginTop: Spacing.sm,
  },
  previewGrid: {
    gap: Spacing.sm,
  },
  previewGridWide: {
    flexDirection: 'row',
  },
  previewItem: {
    backgroundColor: Colors.background,
    borderRadius: Radii.input,
    minWidth: 0,
    padding: Spacing.md,
    width: '100%',
  },
  previewItemWide: {
    flex: 1,
    width: 'auto',
  },
  previewLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
  },
  previewValue: {
    color: Colors.primary,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.body,
    marginTop: Spacing.xs,
  },
  previewUnavailable: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
  },
  errorCard: {
    backgroundColor: '#FCEAEA',
    borderColor: '#F2C7C7',
    borderRadius: Radii.card,
    borderWidth: 1,
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
  actionsWide: {
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
  },
});
