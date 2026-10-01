import { useCallback, useRef, useState } from 'react';
import { Link, router, useFocusEffect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { PrimaryButton } from '@/components/buttons';
import { FormInput } from '@/components/form-input';
import { ScreenContainer } from '@/components/screen-container';
import { SelectionField } from '@/components/selection-field';
import { auth } from '@/config/firebase';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useProfileDraft } from '@/context/profile-draft';
import {
  ACTIVITY_LEVELS,
  GOALS,
  SEX_OPTIONS,
  type ProfileFormValues,
} from '@/types/nutrition-profile';
import { calculateNutritionProfile } from '@/utils/nutrition-calculations';
import { parseProfileForm, validateProfileForm } from '@/utils/profile-validation';

const EMPTY_FORM: ProfileFormValues = {
  age: '',
  sex: null,
  heightCm: '',
  weightKg: '',
  activityLevel: null,
  goal: null,
};

export default function ProfileSetupScreen() {
  const { draft, setDraft } = useProfileDraft();
  const [values, setValues] = useState<ProfileFormValues>(() =>
    draft && draft.uid === auth.currentUser?.uid ? draft.values : EMPTY_FORM,
  );
  const [errors, setErrors] = useState<ReturnType<typeof validateProfileForm>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const continuing = useRef(false);

  useFocusEffect(useCallback(() => {
    continuing.current = false;
  }, []));

  function updateField<K extends keyof ProfileFormValues>(key: K, value: ProfileFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setSubmitError(null);
  }

  function handleContinue() {
    if (continuing.current) return;

    const nextErrors = validateProfileForm(values);
    setErrors(nextErrors);
    setSubmitError(null);
    if (Object.values(nextErrors).some(Boolean)) return;

    const user = auth.currentUser;
    if (!user) {
      setSubmitError('Please log in before continuing with your profile.');
      return;
    }

    const input = parseProfileForm(values);
    if (!input) {
      setSubmitError('Please review your profile information and try again.');
      return;
    }

    try {
      const profile = calculateNutritionProfile(input);
      continuing.current = true;
      setDraft({ uid: user.uid, values, profile });
      router.push('/nutrition-profile-summary');
    } catch {
      continuing.current = false;
      setSubmitError('Please review your profile information and try again.');
    }
  }

  return (
    <ScreenContainer width="form" contentStyle={styles.content}>
      <AppHeader title="Your Profile" subtitle="Tell us about yourself" />

      <View style={styles.fields}>
        <FormInput
          label="Age"
          value={values.age}
          onChangeText={(value) => updateField('age', value)}
          error={errors.age}
          keyboardType="number-pad"
          autoComplete="off"
          maxLength={3}
          placeholder="Your age"
          rightAccessory={<Text style={styles.unit}>years</Text>}
        />
        <SelectionField
          label="Sex"
          options={SEX_OPTIONS}
          value={values.sex}
          onChange={(value) => updateField('sex', value)}
          error={errors.sex}
          mode="chips"
        />
        <FormInput
          label="Height"
          value={values.heightCm}
          onChangeText={(value) => updateField('heightCm', value)}
          error={errors.heightCm}
          keyboardType="decimal-pad"
          autoComplete="off"
          maxLength={5}
          placeholder="Your height"
          rightAccessory={<Text style={styles.unit}>cm</Text>}
        />
        <FormInput
          label="Weight"
          value={values.weightKg}
          onChangeText={(value) => updateField('weightKg', value)}
          error={errors.weightKg}
          keyboardType="decimal-pad"
          autoComplete="off"
          maxLength={6}
          placeholder="Your weight"
          rightAccessory={<Text style={styles.unit}>kg</Text>}
        />
        <SelectionField
          label="Activity Level"
          options={ACTIVITY_LEVELS}
          value={values.activityLevel}
          onChange={(value) => updateField('activityLevel', value)}
          error={errors.activityLevel}
          mode="dropdown"
        />
        <SelectionField
          label="Goal"
          options={GOALS}
          value={values.goal}
          onChange={(value) => updateField('goal', value)}
          error={errors.goal}
          mode="dropdown"
        />
      </View>

      {submitError ? (
        <View style={styles.errorGroup}>
          <Text style={styles.submitError} accessibilityLiveRegion="polite">{submitError}</Text>
          {!auth.currentUser ? <Link href="/login" style={styles.loginLink}>Log In</Link> : null}
        </View>
      ) : null}

      <PrimaryButton label="Continue" onPress={handleContinue} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.section,
  },
  fields: {
    gap: Spacing.lg,
  },
  unit: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
  },
  errorGroup: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  submitError: {
    color: Colors.error,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
    textAlign: 'center',
  },
  loginLink: {
    color: Colors.primary,
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.small,
    paddingVertical: Spacing.md,
  },
});
