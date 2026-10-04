import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { ScreenContainer } from '@/components/screen-container';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';

type FoodOptionCardProps = {
  title: string;
  description: string;
  glyph: string;
  badge?: string;
  accessibilityHint: string;
  onPress: () => void;
  wide: boolean;
};

function FoodOptionCard({
  title,
  description,
  glyph,
  badge,
  accessibilityHint,
  onPress,
  wide,
}: FoodOptionCardProps) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={title}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionCard,
        wide && styles.optionCardWide,
        pressed && styles.optionCardPressed,
      ]}>
      <View style={styles.optionTopRow}>
        <View style={styles.iconWell}>
          <Text style={styles.iconGlyph}>{glyph}</Text>
        </View>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.optionCopy}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
      <View style={styles.optionFooter}>
        <Text style={styles.optionAction}>Continue</Text>
        <Text style={styles.optionArrow}>{'\u203A'}</Text>
      </View>
    </Pressable>
  );
}

export default function AddFoodScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 720;

  return (
    <ScreenContainer width="page" contentStyle={styles.content}>
      <AppHeader
        title="Add Food"
        subtitle="Choose how you would like to add a meal or snack."
      />

      <View style={[styles.options, wide && styles.optionsWide]}>
        <FoodOptionCard
          accessibilityHint="Opens camera and gallery options for a Nutrition Facts label"
          description="Scan a packaged food label to capture its nutrition information."
          glyph={'\u25A3'}
          onPress={() => router.push('/scan-nutrition-label')}
          title="Scan Nutrition Label"
          wide={wide}
        />
        <FoodOptionCard
          accessibilityHint="Opens the manual food entry form"
          description="Enter serving details and nutrition values yourself."
          glyph={'\u270E'}
          onPress={() => router.push('/manual-food-entry')}
          title="Enter Manually"
          wide={wide}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.section,
  },
  options: {
    gap: Spacing.lg,
  },
  optionsWide: {
    alignItems: 'stretch',
    flexDirection: 'row',
  },
  optionCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radii.feature,
    borderWidth: 1,
    gap: Spacing.xxl,
    minHeight: 240,
    padding: Spacing.xxl,
  },
  optionCardWide: {
    flex: 1,
    minWidth: 0,
  },
  optionCardPressed: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accentStrong,
  },
  optionTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  iconWell: {
    alignItems: 'center',
    backgroundColor: Colors.accent,
    borderRadius: Radii.card,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  iconGlyph: {
    color: Colors.primary,
    fontSize: Typography.sizes.metric,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.metric,
  },
  badge: {
    backgroundColor: Colors.progressTrack,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  badgeText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.caption,
  },
  optionCopy: {
    flex: 1,
    gap: Spacing.sm,
  },
  optionTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.section,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.section,
  },
  optionDescription: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.lineHeights.body,
  },
  optionFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  optionAction: {
    color: Colors.primary,
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.small,
  },
  optionArrow: {
    color: Colors.primary,
    fontSize: Typography.sizes.title,
    lineHeight: Typography.lineHeights.title,
  },
});
