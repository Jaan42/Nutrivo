import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, ControlHeight, Radii, Spacing, Typography } from '../constants/theme';

type SelectionFieldProps<T extends string> = {
  label: string;
  options: readonly T[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string;
  mode?: 'chips' | 'dropdown';
};

export function SelectionField<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
  mode = 'chips',
}: SelectionFieldProps<T>) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {mode === 'chips' ? (
        <View style={styles.chipRow}>
          {options.map((option) => {
            const selected = value === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityLabel={`${label}: ${option}`}
                accessibilityState={{ selected }}
                onPress={() => onChange(option)}
                style={({ pressed }) => [
                  styles.chip,
                  selected && styles.chipSelected,
                  error && styles.fieldError,
                  pressed && styles.pressed,
                ]}
              >
                {selected ? <Text style={styles.check}>✓</Text> : null}
                <Text style={[styles.optionText, selected && styles.selectedText]}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${value ?? 'Select an option'}`}
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen((current) => !current)}
            style={({ pressed }) => [
              styles.dropdownTrigger,
              error && styles.fieldError,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.optionText, !value && styles.placeholder]}>{value ?? `Select ${label}`}</Text>
            <Text style={styles.chevron}>{open ? '▴' : '▾'}</Text>
          </Pressable>
          {open ? (
            <View style={styles.dropdownOptions}>
              {options.map((option, index) => {
                const selected = value === option;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityLabel={`${label}: ${option}`}
                    accessibilityState={{ selected }}
                    onPress={() => {
                      onChange(option);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.dropdownOption,
                      index < options.length - 1 && styles.optionDivider,
                      selected && styles.dropdownOptionSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.optionText, selected && styles.selectedText]}>{option}</Text>
                    {selected ? <Text style={styles.selectedText}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      )}

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
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radii.pill,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: ControlHeight,
    minWidth: 0,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  chipSelected: {
    borderColor: Colors.primary,
  },
  check: {
    color: Colors.primary,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    marginRight: Spacing.xs,
  },
  optionText: {
    color: Colors.text,
    flexShrink: 1,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.lineHeights.body,
  },
  selectedText: {
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
  },
  dropdownTrigger: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radii.input,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: ControlHeight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  placeholder: {
    color: Colors.textMuted,
  },
  chevron: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.section,
    marginLeft: Spacing.sm,
  },
  dropdownOptions: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radii.input,
    borderWidth: 1,
    marginTop: Spacing.xs,
    overflow: 'hidden',
  },
  dropdownOption: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: ControlHeight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  dropdownOptionSelected: {
    backgroundColor: Colors.accent,
  },
  optionDivider: {
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
  },
  fieldError: {
    borderColor: Colors.error,
  },
  pressed: {
    opacity: 0.82,
  },
  error: {
    color: Colors.error,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
  },
});
