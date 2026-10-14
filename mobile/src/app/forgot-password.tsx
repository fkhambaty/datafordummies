import { router } from 'expo-router';
import { useState } from 'react';

import { Body, Button, Field, Notice, Screen } from '../components/ui';
import { useSession } from '../lib/session';
import { codeError, emailError, MIN_PASSWORD, passwordError } from '../lib/validation';

export default function ForgotPassword() {
  const { status, requestReset, resetPassword, endLocalSession } = useSession();
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function sendCode() {
    setTouched(true);
    setMessage(null);
    if (emailError(email)) return;
    setBusy(true);
    const outcome = await requestReset(email);
    setBusy(false);
    if (outcome.kind === 'error') {
      setMessage(outcome.message);
      return;
    }
    setTouched(false);
    setStep('code');
  }

  async function save() {
    setTouched(true);
    setMessage(null);
    if (codeError(code) || passwordError(password)) return;
    setBusy(true);
    const outcome = await resetPassword(email, code, password);
    setBusy(false);
    if (outcome.kind === 'error') {
      setMessage(outcome.message);
      return;
    }
    // The Worker ends every session for the account when the password changes.
    if (status === 'signedIn') await endLocalSession();
    setStep('done');
  }

  if (step === 'done') {
    return (
      <Screen edges={['left', 'right', 'bottom']} testID="reset-done">
        <Notice tone="ok">Password changed. Every device has been signed out, including this one.</Notice>
        <Button label="Sign in" onPress={() => router.replace('/sign-in')} />
      </Screen>
    );
  }

  return (
    <Screen edges={['left', 'right', 'bottom']} testID="forgot-password">
      {message ? <Notice tone="error">{message}</Notice> : null}
      {step === 'email' ? (
        <>
          <Body muted>We email a 6-digit reset code if an account uses this address.</Body>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={touched ? emailError(email) : null}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            returnKeyType="go"
            onSubmitEditing={() => void sendCode()}
            testID="reset-email"
          />
          <Button label="Email me a code" loading={busy} onPress={() => void sendCode()} testID="reset-send" />
        </>
      ) : (
        <>
          <Body muted>If {email.trim()} has an account, the code is on its way. It expires after 15 minutes.</Body>
          <Field
            label="Code"
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/gu, '').slice(0, 6))}
            error={touched ? codeError(code) : null}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            testID="reset-code"
          />
          <Field
            label="New password"
            value={password}
            onChangeText={setPassword}
            error={touched ? passwordError(password) : null}
            secret
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder={`At least ${MIN_PASSWORD} characters`}
            returnKeyType="go"
            onSubmitEditing={() => void save()}
            testID="reset-password"
          />
          <Button label="Save new password" loading={busy} onPress={() => void save()} testID="reset-save" />
          <Button label="Use a different email" variant="ghost" onPress={() => setStep('email')} />
        </>
      )}
    </Screen>
  );
}
