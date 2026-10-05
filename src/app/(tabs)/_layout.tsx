import { Redirect, Tabs } from 'expo-router';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  type ColorValue,
} from 'react-native';

import { PrimaryButton } from '@/components/buttons';
import { ScreenContainer } from '@/components/screen-container';
import { TabIcon, type TabIconName } from '@/components/tab-icon';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useUserProfile } from '@/hooks/use-user-profile';

const tabIcon = (name: TabIconName, emphasized = false) =>
  function TabBarIcon({ color, size }: { color: ColorValue; size: number }) {
    return <TabIcon color={color} emphasized={emphasized} name={name} size={size} />;
  };

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const usesSideBySideLabels = Platform.OS === 'web' && width >= 768;
  const profileState = useUserProfile();
  const loading =
    profileState.authLoading ||
    (profileState.user !== null && profileState.profileLoading);

  if (loading) {
    return (
      <ScreenContainer width="form" contentStyle={styles.centeredState}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.stateTitle}>Loading your Nutrivo profile</Text>
      </ScreenContainer>
    );
  }

  if (profileState.authError || profileState.profileError) {
    return (
      <ScreenContainer width="form" contentStyle={styles.centeredState}>
        <Text style={styles.stateTitle}>Profile unavailable</Text>
        <Text style={styles.stateMessage}>
          {profileState.authError ?? profileState.profileError}
        </Text>
        <PrimaryButton label="Try Again" onPress={profileState.reload} />
      </ScreenContainer>
    );
  }

  if (!profileState.user) {
    return <Redirect href="/login" />;
  }

  if (!profileState.profile?.profileCompleted) {
    return <Redirect href="/profile-setup" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarIconStyle: usesSideBySideLabels
          ? { marginRight: Spacing.md }
          : { marginBottom: Spacing.xs },
        tabBarLabelPosition: usesSideBySideLabels ? 'beside-icon' : 'below-icon',
        tabBarLabelStyle: {
          fontSize: Typography.sizes.caption,
          fontWeight: Typography.weights.medium,
        },
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          height: usesSideBySideLabels ? 76 : 88,
          paddingBottom: Spacing.sm,
          paddingTop: usesSideBySideLabels ? Spacing.xs : Spacing.sm,
        },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: tabIcon('home'),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: tabIcon('history'),
        }}
      />
      <Tabs.Screen
        name="add-food"
        options={{
          title: 'Add Food',
          tabBarActiveTintColor: Colors.primary,
          tabBarIcon: tabIcon('add', true),
          tabBarItemStyle: {
            backgroundColor: Colors.accent,
            borderRadius: Radii.button,
            marginVertical: Spacing.xs,
          },
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: tabIcon('insights'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: tabIcon('profile'),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centeredState: {
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.md,
    justifyContent: 'center',
  },
  stateTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.section,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.section,
    textAlign: 'center',
  },
  stateMessage: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.lineHeights.body,
    maxWidth: 380,
    textAlign: 'center',
  },
});
