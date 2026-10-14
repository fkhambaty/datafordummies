import * as SecureStore from 'expo-secure-store';

import { finishOnboarding, hasFinishedOnboarding, parseStoredSession, readSession, writeSession } from '../src/lib/secure-session';
import type { WebSession } from '../src/lib/types';

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

const session: WebSession = {
  token: 'f'.repeat(64),
  user: {
    id: 'dummy-test-account',
    email: 'dummy@datafordummies.in',
    username: 'dummy',
    full_name: null,
    phone: null,
    country_code: null,
    role: 'student',
    subscription_status: 'active',
    subscription_plan: null,
    subscription_end_date: null,
    subscription_cancel_at_cycle_end: false,
    updated_at: null,
  },
};

describe('parseStoredSession', () => {
  it('accepts the dfd_session shape', () => {
    expect(parseStoredSession(JSON.stringify(session))).toEqual(session);
  });

  it.each([null, '', 'nope', '{}', '[]', JSON.stringify({ token: 'not-hex!', user: session.user }), JSON.stringify({ token: 'f'.repeat(64), user: { id: 1 } })])(
    'rejects %p',
    (raw) => {
      expect(parseStoredSession(raw)).toBeNull();
    },
  );
});

describe('SecureStore persistence', () => {
  it('stores the session under dfd_session, device-only', async () => {
    await writeSession(session);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('dfd_session', JSON.stringify(session), {
      keychainAccessible: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
    });
    expect(await readSession()).toEqual(session);
    await writeSession(null);
    expect(await readSession()).toBeNull();
  });

  it('keeps the payload far below the old 2048-byte iOS limit', () => {
    expect(JSON.stringify(session).length).toBeLessThan(1024);
  });

  it('remembers onboarding', async () => {
    expect(await hasFinishedOnboarding()).toBe(false);
    await finishOnboarding();
    expect(await hasFinishedOnboarding()).toBe(true);
  });
});
