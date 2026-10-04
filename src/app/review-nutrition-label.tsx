import { useState } from 'react';
import { router } from 'expo-router';
import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { BackButton } from '@/components/back-button';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { FormInput } from '@/components/form-input';
import { NutritionCard } from '@/components/nutrition-card';
import { ScreenContainer } from '@/components/screen-container';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useNutritionLabelScan } from '@/context/nutrition-label-scan';
import type {
  NutritionLabelReviewErrors,
  NutritionLabelReviewFormValues,
} from '@/types/nutrition-label';
import {
  EMPTY_NUTRITION_LABEL_REVIEW_FORM,
  parseNutritionLabelReview,
  reviewedNutritionToReviewForm,
  toNutritionLabelReviewForm,
  validateNutritionLabelReview,
} from '@/utils/nutrition-label-validation';

type ReviewNutritionField =
  | 'calories'
  | 'protein'
  | 'carbohydrates'
  | 'fat'
  | 'sugar'
  | 'sodium'
  | 'fiber';

const NUTRITION_FIELDS: readonly {
  field: ReviewNutritionField;
  label: string;
  accessibilityHint: string;
}[] = [
  {
    field: 'calories',
    label: 'Calories (kcal)',
    accessibilityHint: 'Enter the calories visibly printed for one serving',
  },
  {
    field: 'protein',
    label: 'Protein (g)',
    accessibilityHint: 'Enter the protein grams visibly printed for one serving',
  },
  {
    field: 'carbohydrates',
    label: 'Carbohydrates (g)',
    accessibilityHint: 'Enter the carbohydrate grams visibly printed for one serving',
  },
  {
    field: 'fat',
    label: 'Fat (g)',
    accessibilityHint: 'Enter the fat grams visibly printed for one serving',
  },
  {
    field: 'sugar',
    label: 'Sugar (g) · optional',
    accessibilityHint: 'Optionally enter the sugar grams visibly printed for one serving',
  },
  {
    field: 'sodium',
    label: 'Sodium (mg) · optional',
    accessibilityHint: 'Optionally enter the sodium milligrams visibly printed for one serving',
  },
  {
    field: 'fiber',
    label: 'Fiber (g) · optional',
    accessibilityHint: 'Optionally enter the fiber grams visibly printed for one serving',
  },
];

export default function ReviewNutritionLabelScreen() {
  const { width } = useWindowDimensions();
  const {
    extractedNutrition,
    image,
    reset,
    reviewMode,
    reviewedNutrition,
    setReviewedNutrition,
  } = useNutritionLabelScan();
  const [values, setValues] = useState<NutritionLabelReviewFormValues>(() =>
    reviewedNutrition
      ? reviewedNutritionToReviewForm(reviewedNutrition)
      : extractedNutrition
      ? toNutritionLabelReviewForm(extractedNutrition)
      : { ...EMPTY_NUTRITION_LABEL_REVIEW_FORM },
  );
  const [errors, setErrors] = useState<NutritionLabelReviewErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const wide = width >= 640;

  function updateField<K extends keyof NutritionLabelReviewFormValues>(
    field: K,
    value: NutritionLabelReviewFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  }

  function goBackToPreview() {
    router.replace('/scan-nutrition-label');
  }

  function cancelReview() {
    reset();
    router.replace('/add-food');
  }

  function enterManually() {
    reset();
    router.replace('/manual-food-entry');
  }

  function continueToServing() {
    const nextErrors = validateNutritionLabelReview(values);
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) {
      setFormError('Complete the required label values before continuing.');
      return;
    }

    const reviewed = parseNutritionLabelReview(values);
    if (!reviewed) {
      setFormError('Review the Nutrition Facts values and try again.');
      return;
    }

    setReviewedNutrition(reviewed);
    router.push('/nutrition-label-serving');
  }

  if (!image || !extractedNutrition || !reviewMode) {
    return (
      <ScreenContainer width="form" contentStyle={styles.emptyContent}>
        <BackButton accessibilityLabel="Back to scanner" onPress={goBackToPreview} />
        <NutritionCard
          title="No label is ready to review"
          subtitle="Choose or photograph a Nutrition Facts label first.">
          <View style={styles.emptyActions}>
            <PrimaryButton label="Open Scanner" onPress={goBackToPreview} />
            <SecondaryButton label="Enter Manually" onPress={enterManually} />
          </View>
        </NutritionCard>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer width="page" contentStyle={styles.content}>
      <BackButton accessibilityLabel="Back to image preview" onPress={goBackToPreview} />
      <AppHeader
        title="Review Nutrition"
        subtitle="Verify every value against the printed label. Empty fields mean not detected—not zero."
      />

      <View style={styles.formShell}>
        <View
          accessibilityLiveRegion="polite"
          style={reviewMode === 'manual-fallback' ? styles.manualNotice : styles.reviewNotice}>
          <Text style={styles.noticeTitle}>
            {reviewMode === 'manual-fallback'
              ? 'Manual label review'
              : 'Check the extracted values'}
          </Text>
          <Text style={styles.noticeText}>
            {reviewMode === 'manual-fallback'
              ? 'Automatic extraction is not configured. Read only values clearly printed in the image; leave anything unreadable empty.'
              : 'Correct any value that does not match the image and leave unreadable values empty.'}
          </Text>
        </View>

        <NutritionCard title="Label image" subtitle="Use this image while reviewing the fields below.">
          <View style={styles.imageShell}>
            <Image
              accessibilityLabel="Nutrition Facts label being reviewed"
              resizeMode="contain"
              source={{ uri: image.uri }}
              style={styles.image}
            />
          </View>
        </NutritionCard>

        <NutritionCard title="Food details">
          <View style={styles.fieldStack}>
            <FormInput
              accessibilityHint="Enter a product name visible on the package, or a descriptive name"
              autoCapitalize="words"
              error={errors.foodName}
              label="Food Name"
              maxLength={100}
              onChangeText={(value) => updateField('foodName', value)}
              placeholder="Not detected"
              value={values.foodName}
            />
            <FormInput
              accessibilityHint="Enter the serving size visibly printed on the label"
              error={errors.servingSize}
              label="Serving Size"
              maxLength={60}
              onChangeText={(value) => updateField('servingSize', value)}
              placeholder="Not detected"
              value={values.servingSize}
            />
          </View>
        </NutritionCard>

        <NutritionCard
          title="Nutrition per serving"
          subtitle="Calories, protein, carbohydrates, and fat are required. Optional unknowns stay empty.">
          <View style={[styles.nutritionGrid, wide && styles.nutritionGridWide]}>
            {NUTRITION_FIELDS.map(({ field, label, accessibilityHint }) => (
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
                  placeholder="Not detected"
                  value={values[field]}
                />
              </View>
            ))}
          </View>
        </NutritionCard>

        {formError ? (
          <View accessibilityLiveRegion="polite" style={styles.errorCard}>
            <Text style={styles.errorText}>{formError}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <PrimaryButton label="Continue to Serving & Meal" onPress={continueToServing} />
          <SecondaryButton label="Enter Manually" onPress={enterManually} />
          <SecondaryButton label="Cancel" onPress={cancelReview} />
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
  manualNotice: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accentStrong,
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: Spacing.xs,
    padding: Spacing.lg,
  },
  reviewNotice: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: Spacing.xs,
    padding: Spacing.lg,
  },
  noticeTitle: {
    color: Colors.primary,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.body,
  },
  noticeText: {
    color: Colors.text,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
  },
  imageShell: {
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radii.input,
    height: 240,
    justifyContent: 'center',
    overflow: 'hidden',
    padding: Spacing.sm,
  },
  image: {
    height: '100%',
    width: '100%',
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
});
