import { router } from 'expo-router';

/** Returns to the screen that asked for sign-in, such as a locked lesson, or to Home. */
export function finishAuth(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)');
}
