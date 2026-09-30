import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Radii, Spacing, Typography } from '../constants/theme';

type NutritionCardProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
}>;

export function NutritionCard({ title, subtitle, style, children }: NutritionCardProps) {
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    borderWidth: 1,
    padding: Spacing.lg,
    width: '100%',
  },
  title: {
    color: Colors.text,
    fontSize: Typography.sizes.section,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.section,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
    marginTop: Spacing.xs,
  },
  content: {
    marginTop: Spacing.md,
  },
});
