import { Stack } from 'expo-router';

import { ProfileDraftProvider } from '@/context/profile-draft';
import { Colors } from '@/constants/theme';

export default function AuthLayout() {
  return (
    <ProfileDraftProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.primary,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: Colors.background },
        }}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="profile-setup" options={{ headerShown: false }} />
        <Stack.Screen name="nutrition-profile-summary" options={{ headerShown: false }} />
      </Stack>
    </ProfileDraftProvider>
  );
}
