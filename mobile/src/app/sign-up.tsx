import { router } from 'expo-router';
import { useState } from 'react';

import { Body, Button, Field, Notice, Row, Screen } from '../components/ui';
import { openSitePage } from '../lib/navigation';
import { useSession } from '../lib/session';
import { emailError, MIN_PASSWORD, passwordError } from '../lib/validation';

export default function SignUp() {
  const { signUp } = useSession();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const emailProblem = touched ? emailError(email) : null;
  const passwordProblem = touched ? passwordError(password) : null;

  async function submit() {
    setTouched(true);
    setMessage(null);
    if (emailError(email) || passwordError(password)) return;
    setBusy(true);
    const outcome = await signUp({ email, password, fullName });
    setBusy(false);
    if (outcome.kind === 'error') setMessage(outcome.message);
    else router.replace({ pathname: '/verify', params: { email: outcome.kind === 'needsVerification' ? outcome.email : email } });
  }

  return (
    <Screen edges={['left', 'right', 'bottom']} testID="sign-up">
      <Body muted>Free. We email a 6-digit code to confirm the address before the account can sign in.</Body>
      {message ? (
        <Notice tone="error" testID="sign-up-error">
          {message}
        </Notice>
      ) : null}
      <Field label="Name (optional)" value={fullName} onChangeText={setFullName} autoComplete="name" textContentType="name" returnKeyType="next" />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={emailProblem}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
        returnKeyType="next"
        testID="sign-up-email"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={passwordProblem}
        secret
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
        placeholder={`At least ${MIN_PASSWORD} characters`}
        testID="sign-up-password"
      />
      <Button label="Create account" loading={busy} onPress={() => void submit()} testID="sign-up-submit" />
      <Body muted>Creating an account means you accept the terms and the privacy policy.</Body>
      <Row title="Terms of use" icon="document-text-outline" onPress={() => openSitePage('terms.html', 'Terms of use')} />
      <Row title="Privacy policy" icon="shield-checkmark-outline" onPress={() => openSitePage('privacy.html', 'Privacy policy')} />
      <Button label="I already have an account" variant="ghost" onPress={() => router.replace('/sign-in')} />
    </Screen>
  );
}
