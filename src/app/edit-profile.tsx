import { useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
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
import { SelectionField } from '@/components/selection-field';
import { Breakpoints, Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useUserProfile, type UserNutritionProfile } from '@/hooks/use-user-profile';
import {
  NutritionProfileSaveError,
  ProfileNotSignedInError,
  updateNutritionProfile,
} from '@/services/profile';
import {
  ACTIVITY_LEVELS,
  GOALS,
  SEX_OPTIONS,
  type NutritionProfile,
  type ProfileFormValues,
  type ProfileValidationErrors,
} from '@/types/nutrition-profile';
import { calculateNutritionProfile } from '@/utils/nutrition-calculations';
import { parseProfileForm, validateProfileForm } from '@/utils/profile-validation';

type EditProfileErrors = ProfileValidationErrors & {
  name?: string;
};

function numberText(value: number | null): string {
  return value === null || !Number.isFinite(value) ? '' : String(value);
}

function formValuesFromProfile(profile: UserNutritionProfile): ProfileFormValues {
  return {
    age: numberText(profile.age),
    sex: profile.sex,
    heightCm: numberText(profile.heightCm),
    weightKg: numberText(profile.weightKg),
    activityLevel: profile.activityLevel,
    goal: profile.goal,
  };
}

function formatNumber(value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value);
}

function EstimatePreview({ profile, wide }: { profile: NutritionProfile; wide: boolean }) {
  const estimates = [
    { label: 'BMI', value: formatNumber(profile.bmi) },
    { label: 'Estimated BMR', value: `${formatNumber(profile.bmr)} kcal/day` },
    { label: 'Maintenance (TDEE)', value: `${formatNumber(profile.tdee, 0)} kcal/day` },
    { label: 'Daily Calories', value: `${formatNumber(profile.calorieTarget, 0)} kcal` },
    { label: 'Protein', value: `${formatNumber(profile.proteinTarget, 0)} g` },
    { label: 'Carbohydrates', value: `${formatNumber(profile.carbohydrateTarget, 0)} g` },
    { label: 'Fat', value: `${formatNumber(profile.fatTarget, 0)} g` },
  ];

  return (
    <View style={[styles.previewGrid, wide && styles.previewGridWide]}>
      {estimates.map((estimate) => (
        <View
          key={estimate.label}
          style={[styles.previewItem, wide && styles.previewItemWide]}>
          <Text style={styles.previewLabel}>{estimate.label}</Text>
          <Text style={styles.previewValue}>{estimate.value}</Text>
        </View>
      ))}
    </View>
  );
}

function EditProfileForm({
  profile,
  email,
  wide,
}: {
  profile: UserNutritionProfile;
  email: string;
  wide: boolean;
}) {
  const [name, setName] = useState(profile.name);
  const [values, setValues] = useState<ProfileFormValues>(() =>
    formValuesFromProfile(profile),
  );
  const [errors, setErrors] = useState<EditProfileErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const preview = useMemo(() => {
    const input = parseProfileForm(values);
    if (!input) return null;

    try {
      return calculateNutritionProfile(input);
    } catch {
      return null;
    }
  }, [values]);

  function updateField<K extends keyof ProfileFormValues>(
    field: K,
    value: ProfileFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSaveError(null);
  }

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/profile');
    }
  }

  async function saveChanges() {
    if (savingRef.current) return;

    const nextErrors: EditProfileErrors = validateProfileForm(values);
    if (!name.trim()) nextErrors.name = 'Enter your full name.';
    setErrors(nextErrors);
    setSaveError(null);
    if (Object.keys(nextErrors).length > 0) return;

    const input = parseProfileForm(values);
    if (!input) {
      setSaveError('Review your profile information and try again.');
      return;
    }

    let updatedProfile: NutritionProfile;
    try {
      updatedProfile = calculateNutritionProfile(input);
    } catch {
      setSaveError('Review your profile information and try again.');
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      await updateNutritionProfile(name, updatedProfile);
      router.replace('/profile');
    } catch (error) {
      setSaveError(
        error instanceof ProfileNotSignedInError
          ? 'Please log in again before updating your profile.'
          : error instanceof NutritionProfileSaveError
            ? "We couldn't save your profile. Check your connection and try again."
            : "We couldn't save your profile. Please try again.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const fieldStyle = wide ? styles.fieldWide : undefined;

  return (
    <View style={styles.formShell}>
      <NutritionCard title="Account" subtitle="Your email is read-only in this version of Nutrivo.">
        <View style={styles.fieldStack}>
          <FormInput
            autoCapitalize="words"
            editable={!saving}
            error={errors.name}
            label="Full Name"
            maxLength={100}
            onChangeText={(value) => {
              setName(value);
              setErrors((current) => ({ ...current, name: undefined }));
              setSaveError(null);
            }}
            placeholder="Your full name"
            value={name}
          />
          <FormInput
            editable={false}
            label="Email"
            style={styles.readOnlyInput}
            value={email || 'Email unavailable'}
          />
        </View>
      </NutritionCard>

      <NutritionCard
        title="Personal Profile"
        subtitle="Changes update your nutrition estimates before you save.">
        <View style={[styles.fieldGrid, wide && styles.fieldGridWide]}>
          <View style={[styles.field, fieldStyle]}>
            <FormInput
              autoComplete="off"
              editable={!saving}
              error={errors.age}
              keyboardType="number-pad"
              label="Age"
              maxLength={3}
              onChangeText={(value) => updateField('age', value)}
              placeholder="Your age"
              rightAccessory={<Text style={styles.unit}>years</Text>}
              value={values.age}
            />
          </View>
          <View style={[styles.field, fieldStyle]}>
            <SelectionField
              error={errors.sex}
              label="Sex"
              mode="chips"
              onChange={(value) => updateField('sex', value)}
              options={SEX_OPTIONS}
              value={values.sex}
            />
          </View>
          <View style={[styles.field, fieldStyle]}>
            <FormInput
              autoComplete="off"
              editable={!saving}
              error={errors.heightCm}
              keyboardType="decimal-pad"
              label="Height"
              maxLength={5}
              onChangeText={(value) => updateField('heightCm', value)}
              placeholder="Your height"
              rightAccessory={<Text style={styles.unit}>cm</Text>}
              value={values.heightCm}
            />
          </View>
          <View style={[styles.field, fieldStyle]}>
            <FormInput
              autoComplete="off"
              editable={!saving}
              error={errors.weightKg}
              keyboardType="decimal-pad"
              label="Weight"
              maxLength={6}
              onChangeText={(value) => updateField('weightKg', value)}
              placeholder="Your weight"
              rightAccessory={<Text style={styles.unit}>kg</Text>}
              value={values.weightKg}
            />
          </View>
          <View style={[styles.field, fieldStyle]}>
            <SelectionField
              error={errors.activityLevel}
              label="Activity Level"
              mode="dropdown"
              onChange={(value) => updateField('activityLevel', value)}
              options={ACTIVITY_LEVELS}
              value={values.activityLevel}
            />
          </View>
          <View style={[styles.field, fieldStyle]}>
            <SelectionField
              error={errors.goal}
              label="Goal"
              mode="dropdown"
              onChange={(value) => updateField('goal', value)}
              options={GOALS}
              value={values.goal}
            />
          </View>
        </View>
      </NutritionCard>

      <NutritionCard title="Updated Estimates" subtitle="Preview only — nothing changes until you save.">
        {preview ? (
          <EstimatePreview profile={preview} wide={wide} />
        ) : (
          <Text style={styles.previewUnavailable}>
            Enter valid personal details to preview your updated nutrition targets.
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
          onPress={goBack}
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

export default function EditProfileScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= Breakpoints.tablet;
  const profileState = useUserProfile();
  const loading =
    profileState.authLoading ||
    (profileState.user !== null && profileState.profileLoading);

  function goToProfile() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/profile');
    }
  }

  if (loading) {
    return (
      <ScreenContainer width="page" contentStyle={styles.centeredState}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.stateTitle}>Loading profile editor</Text>
      </ScreenContainer>
    );
  }

  if (!profileState.user) {
    return (
      <ScreenContainer width="form" contentStyle={styles.centeredState}>
        <Text style={styles.stateTitle}>Log in to edit your profile</Text>
        <Text style={styles.stateMessage}>
          {profileState.authError ?? 'Your profile is tied to your Nutrivo account.'}
        </Text>
        <PrimaryButton label="Go to Log In" onPress={() => router.replace('/login')} />
      </ScreenContainer>
    );
  }

  if (profileState.profileError) {
    return (
      <ScreenContainer width="form" contentStyle={styles.centeredState}>
        <Text style={styles.stateTitle}>Profile unavailable</Text>
        <Text style={styles.stateMessage}>{profileState.profileError}</Text>
        <PrimaryButton label="Try Again" onPress={profileState.reload} />
      </ScreenContainer>
    );
  }

  if (!profileState.profile?.profileCompleted) {
    return (
      <ScreenContainer width="form" contentStyle={styles.emptyContent}>
        <BackButton accessibilityLabel="Back" onPress={goToProfile} />
        <NutritionCard
          title="Profile setup needed"
          subtitle="Complete your profile before using the profile editor.">
          <PrimaryButton
            label="Go to Profile Setup"
            onPress={() => router.replace('/profile-setup')}
          />
        </NutritionCard>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer width="page" contentStyle={styles.content}>
      <BackButton accessibilityLabel="Back to Profile" onPress={goToProfile} />
      <AppHeader
        title="Edit Profile"
        subtitle="Update your details and review recalculated nutrition targets."
      />
      <EditProfileForm
        email={profileState.profile.email}
        key={profileState.user.uid}
        profile={profileState.profile}
        wide={wide}
      />
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
    maxWidth: 380,
    textAlign: 'center',
  },
  formShell: {
    alignSelf: 'center',
    gap: Spacing.lg,
    maxWidth: 760,
    width: '100%',
  },
  fieldStack: {
    gap: Spacing.lg,
  },
  fieldGrid: {
    gap: Spacing.lg,
  },
  fieldGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  field: {
    minWidth: 0,
    width: '100%',
  },
  fieldWide: {
    flexBasis: '47%',
    flexGrow: 1,
    width: 'auto',
  },
  readOnlyInput: {
    backgroundColor: Colors.progressTrack,
    color: Colors.textMuted,
  },
  unit: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
  },
  previewGrid: {
    gap: Spacing.sm,
  },
  previewGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  previewItem: {
    backgroundColor: Colors.background,
    borderRadius: Radii.input,
    gap: Spacing.xs,
    minWidth: 0,
    padding: Spacing.md,
    width: '100%',
  },
  previewItemWide: {
    flexBasis: '30%',
    flexGrow: 1,
    width: 'auto',
  },
  previewLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.caption,
  },
  previewValue: {
    color: Colors.primary,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.body,
  },
  previewUnavailable: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
  },
  errorCard: {
    backgroundColor: Colors.errorSurface,
    borderColor: Colors.errorBorder,
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
