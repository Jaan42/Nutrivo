import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BackButton } from '@/components/back-button';
import { PrimaryButton } from '@/components/buttons';
import { ScreenContainer } from '@/components/screen-container';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';

export default function ScanNutritionLabelScreen() {
  return (
    <ScreenContainer width="form" contentStyle={styles.content}>
      <BackButton
        accessibilityLabel="Back to Add Food"
        onPress={() => router.replace('/add-food')}
      />

      <View style={styles.placeholder}>
        <View style={styles.iconWell}>
          <Text style={styles.icon}>{'\u25A3'}</Text>
        </View>
        <Text style={styles.title}>Nutrition Label Scanner</Text>
        <Text style={styles.message}>
          Label scanning will be available in the next task. You can enter this food manually for
          now.
        </Text>
        <PrimaryButton
          label="Enter Food Manually"
          onPress={() => router.replace('/manual-food-entry')}
          style={styles.action}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: Spacing.section,
  },
  placeholder: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radii.feature,
    borderWidth: 1,
    gap: Spacing.md,
    marginTop: 'auto',
    marginBottom: 'auto',
    padding: Spacing.section,
  },
  iconWell: {
    alignItems: 'center',
    backgroundColor: Colors.accent,
    borderRadius: Radii.pill,
    height: 80,
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    width: 80,
  },
  icon: {
    color: Colors.primary,
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.display,
  },
  title: {
    color: Colors.text,
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.title,
    textAlign: 'center',
  },
  message: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.lineHeights.body,
    textAlign: 'center',
  },
  action: {
    alignSelf: 'stretch',
    marginTop: Spacing.md,
  },
});
