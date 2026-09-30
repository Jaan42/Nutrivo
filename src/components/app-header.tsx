import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '../constants/theme';

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
};

export function AppHeader({ title, subtitle, right }: AppHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: Colors.text,
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.title,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.lineHeights.body,
    marginTop: Spacing.xs,
  },
  right: {
    flexShrink: 0,
  },
});
