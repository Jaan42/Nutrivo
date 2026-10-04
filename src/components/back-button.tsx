import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors, Radii, Spacing, Typography } from '@/constants/theme';

type BackButtonProps = {
  onPress: () => void;
  accessibilityLabel?: string;
};

export function BackButton({
  onPress,
  accessibilityLabel = 'Go back',
}: BackButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={Spacing.sm}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Text style={styles.glyph}>{'\u2039'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radii.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  pressed: {
    backgroundColor: Colors.accent,
  },
  glyph: {
    color: Colors.primary,
    fontSize: Typography.sizes.metric,
    lineHeight: Typography.lineHeights.metric,
    marginBottom: Spacing.xs,
  },
});
