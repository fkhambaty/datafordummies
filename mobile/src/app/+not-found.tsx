import { Stack, router } from 'expo-router';

import { Body, Button, Screen } from '../components/ui';

export default function NotFound() {
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Body>That screen does not exist in the app.</Body>
      <Button label="Go home" onPress={() => router.replace('/(tabs)')} />
    </Screen>
  );
}
