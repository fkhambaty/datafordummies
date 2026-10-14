import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { createApi, type ApiClient, type ApiFailure } from './api';
import { readSession, writeSession } from './secure-session';
import type { Profile, WebSession } from './types';
import { normaliseEmail } from './validation';

export type SessionStatus = 'loading' | 'signedOut' | 'signedIn';

export type AuthOutcome =
  | { kind: 'ok' }
  | { kind: 'needsVerification'; email: string; message: string }
  | { kind: 'error'; message: string };

type SessionValue = {
  status: SessionStatus;
  session: WebSession | null;
  user: Profile | null;
  api: ApiClient;
  signIn: (login: string, password: string) => Promise<AuthOutcome>;
  signUp: (input: { email: string; password: string; fullName: string }) => Promise<AuthOutcome>;
  verify: (email: string, code: string) => Promise<AuthOutcome>;
  resendCode: (email: string) => Promise<AuthOutcome>;
  requestReset: (email: string) => Promise<AuthOutcome>;
  resetPassword: (email: string, code: string, password: string) => Promise<AuthOutcome>;
  signOut: () => Promise<void>;
  deleteAccount: (password: string, confirmation: string) => Promise<AuthOutcome>;
  endLocalSession: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

/** Holds the bearer token for API calls made outside React render. */
class TokenHolder {
  private token: string | null = null;

  get(): string | null {
    return this.token;
  }

  set(token: string | null): void {
    this.token = token;
  }
}

function outcomeOf(failure: ApiFailure): AuthOutcome {
  if (failure.needsVerification) {
    return { kind: 'needsVerification', email: failure.email, message: failure.message };
  }
  return { kind: 'error', message: failure.message };
}

export function SessionProvider({ children, apiOverride }: { children: ReactNode; apiOverride?: ApiClient }) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [session, setSession] = useState<WebSession | null>(null);
  const [tokens] = useState(() => new TokenHolder());

  const api = useMemo(() => apiOverride ?? createApi({ getToken: () => tokens.get() }), [apiOverride, tokens]);

  const store = useCallback(async (next: WebSession | null) => {
    tokens.set(next?.token ?? null);
    setSession(next);
    setStatus(next ? 'signedIn' : 'signedOut');
    try {
      await writeSession(next);
    } catch {
      // The in-memory session still works for this launch; the next launch asks to sign in.
    }
  }, [tokens]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await readSession();
      if (cancelled) return;
      if (!stored) {
        setStatus('signedOut');
        return;
      }
      tokens.set(stored.token);
      setSession(stored);
      setStatus('signedIn');
      const check = await api.session(stored.token);
      if (cancelled || tokens.get() !== stored.token) return;
      if (check.ok && check.data.user) await store({ token: stored.token, user: check.data.user });
      else if (check.ok || check.status === 401) await store(null);
      // A network failure keeps the stored session so the app still opens offline.
    })();
    return () => {
      cancelled = true;
    };
  }, [api, store, tokens]);

  const signIn = useCallback<SessionValue['signIn']>(
    async (login, password) => {
      const result = await api.login(login.trim().toLowerCase(), password);
      if (!result.ok) return outcomeOf(result);
      await store({ token: result.data.token, user: result.data.user });
      return { kind: 'ok' };
    },
    [api, store],
  );

  const signUp = useCallback<SessionValue['signUp']>(
    async ({ email, password, fullName }) => {
      const result = await api.signup({ email: normaliseEmail(email), password, fullName: fullName.trim() });
      if (!result.ok) return outcomeOf(result);
      return { kind: 'needsVerification', email: result.data.email, message: 'We emailed you a 6-digit code.' };
    },
    [api],
  );

  const verify = useCallback<SessionValue['verify']>(
    async (email, code) => {
      const result = await api.verify(normaliseEmail(email), code.trim());
      if (!result.ok) return outcomeOf(result);
      await store({ token: result.data.token, user: result.data.user });
      return { kind: 'ok' };
    },
    [api, store],
  );

  const resendCode = useCallback<SessionValue['resendCode']>(
    async (email) => {
      const result = await api.resendCode(normaliseEmail(email));
      return result.ok ? { kind: 'ok' } : outcomeOf(result);
    },
    [api],
  );

  const requestReset = useCallback<SessionValue['requestReset']>(
    async (email) => {
      const result = await api.forgotPassword(normaliseEmail(email));
      return result.ok ? { kind: 'ok' } : outcomeOf(result);
    },
    [api],
  );

  const resetPassword = useCallback<SessionValue['resetPassword']>(
    async (email, code, password) => {
      const result = await api.resetPassword(normaliseEmail(email), code.trim(), password);
      return result.ok ? { kind: 'ok' } : outcomeOf(result);
    },
    [api],
  );

  const deleteAccount = useCallback<SessionValue['deleteAccount']>(
    async (password, confirmation) => {
      const result = await api.deleteAccount(password, confirmation);
      if (!result.ok) return outcomeOf(result);
      await store(null);
      return { kind: 'ok' };
    },
    [api, store],
  );

  const endLocalSession = useCallback(() => store(null), [store]);

  const signOut = useCallback(async () => {
    const token = tokens.get();
    if (token) await api.logout(token);
    await store(null);
  }, [api, store, tokens]);

  const refreshProfile = useCallback(async () => {
    const token = tokens.get();
    if (!token) return;
    const result = await api.profile();
    if (result.ok) await store({ token, user: result.data.profile });
    else if (result.status === 401) await store(null);
  }, [api, store, tokens]);

  const value = useMemo<SessionValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      api,
      signIn,
      signUp,
      verify,
      resendCode,
      requestReset,
      resetPassword,
      signOut,
      deleteAccount,
      endLocalSession,
      refreshProfile,
    }),
    [status, session, api, signIn, signUp, verify, resendCode, requestReset, resetPassword, signOut, deleteAccount, endLocalSession, refreshProfile],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
