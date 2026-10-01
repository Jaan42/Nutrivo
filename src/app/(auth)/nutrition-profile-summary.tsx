import { useRef, useState } from 'react';
import { Link, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { NutritionCard } from '@/components/nutrition-card';
import { ScreenContainer } from '@/components/screen-container';
import { auth } from '@/config/firebase';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useProfileDraft } from '@/context/profile-draft';
import { saveNutritionProfile, ProfileNotSignedInError } from '@/services/profile';
import { validateProfileInput } from '@/utils/profile-validation';

function formatWholeNumber(value: number) {
  return Math.round(value).toLocaleString('en-US');
}

export default function NutritionProfileSummaryScreen() {
  const { draft, setDraft } = useProfileDraft();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const profile = draft?.profile;
  const validProfile = profile && Object.keys(validateProfileInput(profile)).length === 0;

  async function handleFinish() {
    if (savingRef.current || !draft || !validProfile) return;

    if (auth.currentUser?.uid !== draft.uid) {
      setSaveError('Please log in and enter your profile again before finishing.');
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      await saveNutritionProfile(draft.profile);
      setDraft(null);
      router.replace('/home');
    } catch (error) {
      setSaveError(
        error instanceof ProfileNotSignedInError
          ? 'Please log in before finishing your profile.'
          : "We couldn't save your profile. Check your connection and try again.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (!profile || !validProfile) {
    return (
      <ScreenContainer width="form" contentStyle={styles.content}>
        <AppHeader title="Your Nutrition Profile" subtitle="Based on your information" />
        <Text style={styles.emptyMessage}>
          Your profile details are not available. Return to Profile Setup to continue.
        </Text>
        <PrimaryButton label="Edit Profile" onPress={() => router.replace('/profile-setup')} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer width="form" contentStyle={styles.content}>
      <AppHeader title="Your Nutrition Profile" subtitle="Based on your information" />

      <NutritionCard title="BMI">
        <Text style={styles.metric}>{profile.bmi.toFixed(1)}</Text>
      </NutritionCard>

      <NutritionCard title="Estimated Daily Calories" subtitle="Maintenance estimate">
        <Text style={styles.metric}>
          {formatWholeNumber(profile.tdee)} <Text style={styles.metricUnit}>kcal</Text>
        </Text>
      </NutritionCard>

      <NutritionCard title="Your Daily Target" subtitle={profile.goal}>
        <Text style={styles.metric}>
          {formatWholeNumber(profile.calorieTarget)} <Text style={styles.metricUnit}>kcal</Text>
        </Text>
      </NutritionCard>

      <NutritionCard title="Macro Targets" subtitle="Based on your daily calorie target">
        <View style={styles.rows}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Protein · 30%</Text>
            <Text style={styles.detailValue}>{formatWholeNumber(profile.proteinTarget)} g</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Carbohydrates · 40%</Text>
            <Text style={styles.detailValue}>{formatWholeNumber(profile.carbohydrateTarget)} g</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Fat · 30%</Text>
            <Text style={styles.detailValue}>{formatWholeNumber(profile.fatTarget)} g</Text>
          </View>
        </View>
      </NutritionCard>

      <NutritionCard title="Your Selections">
        <View style={styles.rows}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Activity Level</Text>
            <Text style={styles.detailValue}>{profile.activityLevel}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Goal</Text>
            <Text style={styles.detailValue}>{profile.goal}</Text>
          </View>
        </View>
      </NutritionCard>

      <View style={styles.note}>
        <Text style={styles.noteText}>
          These values are estimates intended for general nutrition tracking and are not medical advice.
        </Text>
      </View>

      {saveError ? (
        <View style={styles.errorGroup}>
          <Text style={styles.saveError} accessibilityLiveRegion="polite">{saveError}</Text>
          {!auth.currentUser ? <Link href="/login" style={styles.loginLink}>Log In</Link> : null}
        </View>
      ) : null}

      <View style={styles.actions}>
        <SecondaryButton
          label="Back to Edit"
          disabled={saving}
          onPress={() => router.replace('/profile-setup')}
        />
        <PrimaryButton
          label={saving ? 'Saving Profile...' : 'Finish'}
          loading={saving}
          onPress={() => void handleFinish()}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.lg,
  },
  metric: {
    color: Colors.primary,
    fontSize: Typography.sizes.metric,
    fontWeight: Typography.weights.heavy,
    lineHeight: Typography.lineHeights.metric,
  },
  metricUnit: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    lineHeight: Typography.lineHeights.body,
  },
  rows: {
    gap: Spacing.md,
  },
  detailRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  detailLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
  },
  detailValue: {
    color: Colors.text,
    flexShrink: 1,
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.small,
    textAlign: 'right',
  },
  note: {
    backgroundColor: Colors.accent,
    borderRadius: Radii.card,
    padding: Spacing.lg,
  },
  noteText: {
    color: Colors.primary,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
  },
  errorGroup: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  saveError: {
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
  emptyMessage: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.lineHeights.body,
  },
  actions: {
    gap: Spacing.md,
    paddingBottom: Spacing.sm,
  },
});
