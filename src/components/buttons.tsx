import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, ControlHeight, Radii, Spacing, Typography } from '../constants/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

function Button({ label, onPress, disabled = false, style, secondary = false }: ButtonProps & { secondary?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary ? styles.secondary : styles.primary,
        pressed && !disabled && (secondary ? styles.secondaryPressed : styles.primaryPressed),
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, secondary ? styles.secondaryLabel : styles.primaryLabel]}>{label}</Text>
    </Pressable>
  );
}

export function PrimaryButton(props: ButtonProps) {
  return <Button {...props} />;
}

export function SecondaryButton(props: ButtonProps) {
  return <Button {...props} secondary />;
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: Radii.button,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: ControlHeight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  primary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  primaryPressed: {
    backgroundColor: Colors.primaryPressed,
    borderColor: Colors.primaryPressed,
  },
  secondary: {
    backgroundColor: Colors.surface,
    borderColor: Colors.primary,
  },
  secondaryPressed: {
    backgroundColor: Colors.background,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    flexShrink: 1,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.body,
    textAlign: 'center',
  },
  primaryLabel: {
    color: Colors.onPrimary,
  },
  secondaryLabel: {
    color: Colors.primary,
  },
});
