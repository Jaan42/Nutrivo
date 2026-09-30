import { useEffect } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { ScreenContainer } from '@/components/screen-container';
import { Colors, Spacing, Typography } from '@/constants/theme';

export default function SplashScreen() {
  useEffect(() => {
    const timeout = setTimeout(() => router.replace('/onboarding'), 1800);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <ScreenContainer width="form" contentStyle={styles.content}>
      <View style={styles.brand}>
        <BrandMark size={96} />
        <Text style={styles.name}>Nutrivo</Text>
        <Text style={styles.motto}>Scan. Track. Understand.</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  brand: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.section,
  },
  name: {
    color: Colors.primary,
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.heavy,
    lineHeight: Typography.lineHeights.display,
  },
  motto: {
    color: Colors.text,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.lineHeights.body,
  },
});
