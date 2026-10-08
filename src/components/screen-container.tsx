import type { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Breakpoints, Colors, ContentWidths, Spacing } from '../constants/theme';

type ScreenContainerProps = PropsWithChildren<{
  width?: keyof typeof ContentWidths;
  contentStyle?: StyleProp<ViewStyle>;
}>;

export function ScreenContainer({
  children,
  width = 'page',
  contentStyle,
}: ScreenContainerProps) {
  const { width: windowWidth } = useWindowDimensions();
  const compact = windowWidth > 0 && windowWidth < Breakpoints.compact;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardArea}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            compact && styles.scrollContentCompact,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={Platform.OS === 'web'}>
          <View style={[styles.content, { maxWidth: ContentWidths[width] }, contentStyle]}>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.section,
  },
  scrollContentCompact: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxl,
  },
  content: {
    width: '100%',
  },
});
