import { useState } from 'react';
import { Pressable, StyleSheet, Text, type TextInputProps } from 'react-native';

import { FormInput } from '@/components/form-input';
import { Colors, Spacing, Typography } from '@/constants/theme';

type PasswordInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  autoComplete?: TextInputProps['autoComplete'];
  editable?: boolean;
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  returnKeyType?: TextInputProps['returnKeyType'];
};

export function PasswordInput({ label, value, onChangeText, error, ...inputProps }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <FormInput
      {...inputProps}
      label={label}
      value={value}
      onChangeText={onChangeText}
      error={error}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      rightAccessory={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          accessibilityState={{ disabled: inputProps.editable === false }}
          disabled={inputProps.editable === false}
          onPress={() => setVisible((previous) => !previous)}
          style={styles.toggle}>
          <Text style={styles.toggleText}>{visible ? 'Hide' : 'Show'}</Text>
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  toggle: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: Spacing.sm,
  },
  toggleText: {
    color: Colors.primary,
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.small,
  },
});
