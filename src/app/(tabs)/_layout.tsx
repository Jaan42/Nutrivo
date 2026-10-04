import { Tabs } from 'expo-router';
import { Platform, useWindowDimensions, type ColorValue } from 'react-native';

import { TabIcon, type TabIconName } from '@/components/tab-icon';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';

const tabIcon = (name: TabIconName, emphasized = false) =>
  function TabBarIcon({ color, size }: { color: ColorValue; size: number }) {
    return <TabIcon color={color} emphasized={emphasized} name={name} size={size} />;
  };

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const usesSideBySideLabels = Platform.OS === 'web' && width >= 768;

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
