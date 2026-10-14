import { router } from 'expo-router';
import { useState } from 'react';

import { Body, Button, Field, Notice, Screen } from '../components/ui';
import { finishAuth } from '../lib/auth-flow';
import { useSession } from '../lib/session';
import { loginError } from '../lib/validation';

export default function SignIn() {
  const { signIn } = useSession();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loginProblem = touched ? loginError(login) : null;
  const passwordProblem = touched && !password ? 'Enter your password.' : null;

  async function submit() {
    setTouched(true);
    setMessage(null);
    if (loginError(login) || !password) return;
    setBusy(true);
    const outcome = await signIn(login, password);
    setBusy(false);
    if (outcome.kind === 'ok') finishAuth();
    else if (outcome.kind === 'needsVerification') router.replace({ pathname: '/verify', params: { email: outcome.email } });
    else setMessage(outcome.message);
  }

  return (
    <Screen edges={['left', 'right', 'bottom']} testID="sign-in">
      <Body muted>Use the same account as datafordummies.in.</Body>
      {message ? (
        <Notice tone="error" testID="sign-in-error">
          {message}
        </Notice>
      ) : null}
      <Field
        label="Email or username"
        value={login}
        onChangeText={setLogin}
        error={loginProblem}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        keyboardType="email-address"
        returnKeyType="next"
        testID="sign-in-login"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={passwordProblem}
        secret
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
        testID="sign-in-password"
      />
      <Button label="Sign in" loading={busy} onPress={() => void submit()} testID="sign-in-submit" />
      <Button label="Forgot password?" variant="ghost" onPress={() => router.replace('/forgot-password')} />
      <Button label="Create a free account" variant="secondary" onPress={() => router.replace('/sign-up')} />
    </Screen>
  );
}
