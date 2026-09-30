import { useState } from 'react';
import { Link, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { FormInput } from '@/components/form-input';
import { NutritionCard } from '@/components/nutrition-card';
import { ProgressBar } from '@/components/progress-bar';
import { ScreenContainer } from '@/components/screen-container';
import { Colors, ControlHeight, Radii, Spacing, Typography } from '@/constants/theme';

export default function Index() {
  const [foodName, setFoodName] = useState('');

  return (
    <ScreenContainer width="form">
      <View style={styles.content}>
        <AppHeader
          title="Nutrivo"
          subtitle="Scan. Track. Understand."
          right={
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>Preview</Text>
            </View>
          }
        />

        <NutritionCard title="Daily progress" subtitle="Sample component preview">
          <View style={styles.metricRow}>
            <Text style={styles.metric}>68%</Text>
            <Text style={styles.metricCaption}>of a daily target</Text>
          </View>
          <ProgressBar progress={0.68} accessibilityLabel="Sample daily progress" />
        </NutritionCard>

        <FormInput
          label="Food name"
          placeholder="Type to test the input"
          value={foodName}
          onChangeText={setFoodName}
          returnKeyType="done"
        />

        <View style={styles.actions}>
          <PrimaryButton label="Open Home" onPress={() => router.push('/home')} />
          <SecondaryButton label="Preview Log In" onPress={() => router.push('/login')} />
        </View>

        <View style={styles.links}>
          <Link href="/register" style={styles.link}>Register</Link>
          <Link href="/profile-setup" style={styles.link}>Profile Setup</Link>
        </View>

        <Text style={styles.helper}>Sample values only. Nothing entered here is saved.</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.xxl,
  },
  previewBadge: {
    backgroundColor: Colors.accent,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  previewBadgeText: {
    color: Colors.primary,
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.caption,
  },
  metricRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  metric: {
    color: Colors.primary,
    fontSize: Typography.sizes.metric,
    fontWeight: Typography.weights.heavy,
    lineHeight: Typography.lineHeights.metric,
  },
  metricCaption: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
  },
  actions: {
    gap: Spacing.md,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xl,
    justifyContent: 'center',
  },
  link: {
    color: Colors.primary,
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.small,
    minHeight: ControlHeight,
    paddingVertical: Spacing.lg,
  },
  helper: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
    textAlign: 'center',
  },
});
