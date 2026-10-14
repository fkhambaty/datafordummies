import { router } from 'expo-router';
import { useState } from 'react';

import { Body, Button, Field, Notice, Screen } from '../components/ui';
import { useSession } from '../lib/session';
import { MIN_PASSWORD, passwordError } from '../lib/validation';

const CONFIRMATION = 'DELETE';

function isDemo(user: { id: string; username: string | null } | null): boolean {
  return user?.id === 'dummy-test-account' || user?.username === 'dummy';
}

export default function DeleteAccount() {
  const { status, user, deleteAccount } = useSession();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <Screen edges={['left', 'right', 'bottom']} testID="delete-done">
        <Notice tone="ok">The account has been deleted, and this device is signed out.</Notice>
        <Button label="Go home" onPress={() => router.replace('/(tabs)')} />
      </Screen>
    );
  }

  if (status !== 'signedIn' || !user) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <Body>Sign in before deleting an account.</Body>
        <Button label="Sign in" onPress={() => router.replace('/sign-in')} />
      </Screen>
    );
  }

  if (isDemo(user)) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <Notice tone="info">This demo account cannot be deleted.</Notice>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const phraseMatches = confirmation === CONFIRMATION;
  const passwordProblem = touched ? passwordError(password) : null;
  const phraseProblem = touched && !phraseMatches ? `Type ${CONFIRMATION} in capitals.` : null;

  async function submit() {
    setTouched(true);
    setMessage(null);
    if (passwordError(password) || !phraseMatches) return;
    setBusy(true);
    const outcome = await deleteAccount(password, confirmation);
    setBusy(false);
    if (outcome.kind === 'ok') setDone(true);
    else setMessage(outcome.message);
  }

  return (
    <Screen edges={['left', 'right', 'bottom']} testID="delete-account">
      <Body>
        This deletes the account for {user.email}, saved lessons, and completion requests. An active Pro subscription is
        stopped first. If that stop fails, the account stays. Razorpay keeps its own charge records.
      </Body>
      {message ? (
        <Notice tone="error" testID="delete-error">
          {message}
        </Notice>
      ) : null}
      <Field
        label="Current password"
        value={password}
        onChangeText={setPassword}
        error={passwordProblem}
        secret
        autoComplete="current-password"
        textContentType="password"
        placeholder={`At least ${MIN_PASSWORD} characters`}
        testID="delete-password"
      />
      <Field
        label={`Type ${CONFIRMATION} to confirm`}
        value={confirmation}
        onChangeText={setConfirmation}
        error={phraseProblem}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        testID="delete-phrase"
      />
      <Button
        label="Delete account"
        variant="danger"
        loading={busy}
        disabled={!phraseMatches || password.length < MIN_PASSWORD}
        onPress={() => void submit()}
        testID="delete-submit"
      />
      <Button label="Keep the account" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
