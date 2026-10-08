import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Colors, ControlHeight, Radii, Spacing, Typography } from '../constants/theme';

type FormInputProps = TextInputProps & {
  label: string;
  error?: string;
  rightAccessory?: ReactNode;
};

export function FormInput({
  label,
  error,
  rightAccessory,
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
      <View style={styles.field}>
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
          style={[
            styles.input,
            rightAccessory ? styles.inputWithAccessory : undefined,
            inputProps.editable === false && styles.inputDisabled,
            focused && styles.inputFocused,
            error && styles.inputError,
            style,
          ]}
        />
        {rightAccessory ? <View style={styles.accessory}>{rightAccessory}</View> : null}
      </View>
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
  field: {
    position: 'relative',
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
  inputWithAccessory: {
    paddingRight: ControlHeight + Spacing.sm,
  },
  accessory: {
    position: 'absolute',
    right: Spacing.xs,
    top: Spacing.xs,
    bottom: Spacing.xs,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputFocused: {
    borderColor: Colors.primary,
  },
  inputDisabled: {
    backgroundColor: Colors.progressTrack,
    color: Colors.textMuted,
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
