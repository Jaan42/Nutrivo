import { Link, router } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { PrimaryButton } from '@/components/buttons';
import { OnboardingIllustration } from '@/components/onboarding-illustration';
import { ScreenContainer } from '@/components/screen-container';
import { Colors, Spacing, Typography } from '@/constants/theme';

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const illustrationSize = width > 0 ? Math.min(252, width - Spacing.xl * 2) : 252;

  return (
    <ScreenContainer width="form" contentStyle={styles.content}>
      <View style={styles.introduction}>
        <OnboardingIllustration size={illustrationSize} />
        <View style={styles.copy}>
          <Text style={styles.title}>Track your nutrition easily</Text>
          <Text style={styles.description}>
            Log your meals, keep an eye on your nutrition, and see your progress as you build healthier habits.
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Get Started" onPress={() => router.push('/register')} />
        <View style={styles.loginRow}>
          <Text style={styles.prompt}>Already have an account?</Text>
          <Link href="/login" style={styles.link}>Log In</Link>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: Spacing.section,
  },
  introduction: {
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.section,
    justifyContent: 'center',
    paddingVertical: Spacing.section,
  },
  copy: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  title: {
    color: Colors.text,
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.title,
    textAlign: 'center',
  },
  description: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.lineHeights.body,
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  loginRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  prompt: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
  },
  link: {
    color: Colors.primary,
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.small,
    paddingVertical: Spacing.md,
  },
});
