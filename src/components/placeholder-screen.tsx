import type { PropsWithChildren } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Colors, Spacing, Typography } from '@/constants/theme';

import { ScreenContainer } from './screen-container';

type PlaceholderScreenProps = PropsWithChildren<{
  title: string;
}>;

export function PlaceholderScreen({ title, children }: PlaceholderScreenProps) {
  return (
    <ScreenContainer width="form" contentStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Screen preview</Text>
      {children}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  title: {
    color: Colors.text,
    fontSize: Typography.sizes.title,
    lineHeight: Typography.lineHeights.title,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.lineHeights.body,
    textAlign: 'center',
  },
});
