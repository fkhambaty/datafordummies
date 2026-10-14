import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Body, Button, Field, Notice, Screen } from '../components/ui';
import { finishAuth } from '../lib/auth-flow';
import { useSession } from '../lib/session';
import { codeError, emailError } from '../lib/validation';

/** The Worker refuses a new code within 60 seconds of the last one. */
const RESEND_SECONDS = 60;

export default function Verify() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { verify, resendCode } = useSession();
  const [email, setEmail] = useState(String(params.email ?? ''));
  const [code, setCode] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [wait, setWait] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  async function submit() {
    setTouched(true);
    setMessage(null);
    if (emailError(email) || codeError(code)) return;
    setBusy(true);
    const outcome = await verify(email, code);
    setBusy(false);
    if (outcome.kind === 'ok') finishAuth();
    else setMessage({ tone: 'error', text: outcome.message });
  }

  async function resend() {
    if (emailError(email)) {
      setTouched(true);
      return;
    }
    setWait(RESEND_SECONDS);
    const outcome = await resendCode(email);
    setMessage(
      outcome.kind === 'error'
        ? { tone: 'error', text: outcome.message }
        : { tone: 'ok', text: 'If that account is waiting for confirmation, a new code is on its way.' },
    );
  }

  return (
    <Screen edges={['left', 'right', 'bottom']} testID="verify">
      <Body muted>Enter the 6-digit code we emailed you. Codes expire after 15 minutes and allow 5 tries.</Body>
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={touched ? emailError(email) : null}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
      />
      <Field
        label="Code"
        value={code}
        onChangeText={(value) => setCode(value.replace(/\D/gu, '').slice(0, 6))}
        error={touched ? codeError(code) : null}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
        testID="verify-code"
      />
      <Button label="Confirm email" loading={busy} onPress={() => void submit()} testID="verify-submit" />
      <Button
        label={wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
        variant="secondary"
        disabled={wait > 0}
        onPress={() => void resend()}
      />
    </Screen>
  );
}
