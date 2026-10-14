import { router } from 'expo-router';

import { Body, Button, Card, Heading, Notice, Screen } from '../components/ui';
import { accessFor, describeAccess } from '../lib/entitlement';
import { useSession } from '../lib/session';

export default function Pro() {
  const { status, user } = useSession();
  const access = accessFor(user);

  return (
    <Screen edges={['left', 'right', 'bottom']} testID="pro-policy">
      <Heading level={2}>Pro is not sold in this app</Heading>
      <Body>
        The app has no checkout. It does not show prices or take payments, and it does not send you to a payment page.
      </Body>
      <Card>
        <Heading level={3}>If your account already has Pro</Heading>
        <Body muted>
          Sign in with that account. Each Pro lesson asks the Data For Dummies server whether your account has Pro, the same
          check the website makes, and opens when the answer is yes.
        </Body>
      </Card>
      {status === 'signedIn' ? (
        <Notice tone={access === 'free' ? 'info' : 'ok'}>{describeAccess(user)}</Notice>
      ) : (
        <Button label="Sign in" onPress={() => router.replace('/sign-in')} />
      )}
      <Body muted>Free lessons, tools and saved progress work on every account.</Body>
      <Button label="Back to learning" variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
    </Screen>
  );
}
