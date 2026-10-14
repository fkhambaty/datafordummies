import * as SecureStore from 'expo-secure-store';

import { WEB_SESSION_KEY } from './config';
import type { Profile, WebSession } from './types';

const ONBOARDING_KEY = 'dfd_onboarding_done';

/** Keychain entries are not restored onto another device from a backup. */
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

function isProfile(value: unknown): value is Profile {
  if (!value || typeof value !== 'object') return false;
  const profile = value as Record<string, unknown>;
  return typeof profile.id === 'string' && typeof profile.email === 'string' && typeof profile.role === 'string';
}

export function parseStoredSession(raw: string | null): WebSession | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const { token, user } = parsed as Record<string, unknown>;
    if (typeof token !== 'string' || !/^[0-9a-f]{32,128}$/iu.test(token) || !isProfile(user)) return null;
    return { token, user };
  } catch {
    return null;
  }
}

export async function readSession(): Promise<WebSession | null> {
  try {
    return parseStoredSession(await SecureStore.getItemAsync(WEB_SESSION_KEY, OPTIONS));
  } catch {
    return null;
  }
}

export async function writeSession(session: WebSession | null): Promise<void> {
  if (!session) {
    await SecureStore.deleteItemAsync(WEB_SESSION_KEY, OPTIONS);
    return;
  }
  await SecureStore.setItemAsync(WEB_SESSION_KEY, JSON.stringify(session), OPTIONS);
}

export async function hasFinishedOnboarding(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(ONBOARDING_KEY, OPTIONS)) === '1';
  } catch {
    return false;
  }
}

export async function finishOnboarding(): Promise<void> {
  await SecureStore.setItemAsync(ONBOARDING_KEY, '1', OPTIONS);
}
