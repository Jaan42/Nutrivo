import { Tabs } from 'expo-router';

import { Colors, Radii, Spacing, Typography } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: Typography.sizes.caption,
          fontWeight: Typography.weights.medium,
        },
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
        },
      }}>
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen
        name="add-food"
        options={{
          title: 'Add Food',
          tabBarItemStyle: {
            backgroundColor: Colors.accent,
            borderRadius: Radii.button,
            marginVertical: Spacing.xs,
          },
        }}
      />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
