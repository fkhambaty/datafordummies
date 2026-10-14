import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts,
} from '@expo-google-fonts/outfit';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider, useSession } from '../lib/session';
import { colors, fonts } from '../theme';

void SplashScreen.preventAutoHideAsync();

function Navigator() {
  const { status } = useSession();
  const [fontsLoaded, fontError] = useFonts({ Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold });
  const ready = (fontsLoaded || fontError !== null) && status !== 'loading';

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.accent,
        headerTitleStyle: { fontFamily: fonts.semibold, color: colors.ink },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.wash },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="course/[id]" options={{ title: 'Course' }} />
      <Stack.Screen name="learn" options={{ title: '' }} />
      <Stack.Screen name="sign-in" options={{ title: 'Sign in', presentation: 'modal' }} />
      <Stack.Screen name="sign-up" options={{ title: 'Create account', presentation: 'modal' }} />
      <Stack.Screen name="verify" options={{ title: 'Confirm email', presentation: 'modal' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Reset password', presentation: 'modal' }} />
      <Stack.Screen name="certificates" options={{ title: 'Completion records' }} />
      <Stack.Screen name="pro" options={{ title: 'Pro on mobile', presentation: 'modal' }} />
      <Stack.Screen name="delete-account" options={{ title: 'Delete account' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <Navigator />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
