import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Colors, ControlHeight, Radii, Spacing, Typography } from '../constants/theme';

type FormInputProps = TextInputProps & {
  label: string;
  error?: string;
};

export function FormInput({
  label,
  error,
  style,
  onFocus,
  onBlur,
  accessibilityLabel,
  placeholderTextColor = Colors.textMuted,
  ...inputProps
}: FormInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={accessibilityLabel ?? label}
        placeholderTextColor={placeholderTextColor}
        selectionColor={Colors.primary}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[styles.input, focused && styles.inputFocused, error && styles.inputError, style]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  label: {
    color: Colors.text,
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.medium,
    lineHeight: Typography.lineHeights.small,
  },
  input: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radii.input,
    borderWidth: 1,
    color: Colors.text,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.lineHeights.body,
    minHeight: ControlHeight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  inputFocused: {
    borderColor: Colors.primary,
  },
  inputError: {
    borderColor: Colors.error,
  },
  error: {
    color: Colors.error,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
  },
});
