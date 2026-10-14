import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Alert, Text } from 'react-native';

import DeleteAccount from '../src/app/delete-account';
import ForgotPassword from '../src/app/forgot-password';
import Learn from '../src/app/learn';
import SignIn from '../src/app/sign-in';
import type { ApiClient, ApiResult } from '../src/lib/api';
import { SessionProvider, useSession } from '../src/lib/session';
import type { Profile } from '../src/lib/types';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
let mockParams: Record<string, string> = {};
const mockWebViewRef: { current: Record<string, unknown> | null } = { current: null };
const mockStore = new Map<string, string>();

jest.mock('expo-router', () => ({
  get router() {
    return mockRouter;
  },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (effect: () => void | (() => void)) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(() => effect(), [effect]);
  },
  Stack: { Screen: () => null },
}));

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStore.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockStore.delete(key);
  }),
}));

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(async () => ({ type: 'opened' })) }));

jest.mock('react-native-webview', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const { forwardRef } = jest.requireActual<typeof import('react')>('react');
  return {
    WebView: forwardRef(function MockWebView(props: Record<string, unknown>, _ref) {
      // The mock records what the screen passed in. It is a test spy, not rendered state.
      // eslint-disable-next-line react-hooks/immutability
      mockWebViewRef.current = props;
      return <View testID="lesson-webview" />;
    }),
  };
});

const profile: Profile = {
  id: 'dummy-test-account',
  email: 'dummy@datafordummies.in',
  username: 'dummy',
  full_name: 'Dummy Learner',
  phone: null,
  country_code: null,
  role: 'student',
  subscription_status: 'active',
  subscription_plan: null,
  subscription_end_date: null,
  subscription_cancel_at_cycle_end: false,
  updated_at: null,
};

const TOKEN = 'ab'.repeat(32);

function ok<T>(data: T): Promise<ApiResult<T>> {
  return Promise.resolve({ ok: true, data });
}

function fail(status: number, message: string, extra: Partial<{ needsVerification: boolean; email: string }> = {}) {
  return Promise.resolve({ ok: false as const, status, message, needsVerification: false, email: '', missing: [], ...extra });
}

function fakeApi(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    login: jest.fn(() => ok({ token: TOKEN, user: profile })),
    signup: jest.fn(() => ok({ needs_verification: true as const, email: 'a@b.co' })),
    verify: jest.fn(() => ok({ token: TOKEN, user: profile })),
    resendCode: jest.fn(() => ok({ ok: true as const })),
    forgotPassword: jest.fn(() => ok({ ok: true as const })),
    resetPassword: jest.fn(() => ok({ ok: true as const })),
    logout: jest.fn(() => ok({ ok: true as const })),
    session: jest.fn(() => ok({ user: profile })),
    profile: jest.fn(() => ok({ profile })),
    progress: jest.fn(() => ok({ progress: [] })),
    certificates: jest.fn(() => ok({ certificates: [] })),
    requestCertificate: jest.fn(() => fail(409, 'Not yet')),
    deleteAccount: jest.fn(() => fail(400, 'Type DELETE to confirm.')),
    ...overrides,
  } as ApiClient;
}

function Status() {
  const { status } = useSession();
  return <Text>{status}</Text>;
}

function withSession(api: ApiClient, children: ReactNode) {
  return (
    <SessionProvider apiOverride={api}>
      {children}
    </SessionProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStore.clear();
  mockParams = {};
  mockWebViewRef.current = null;
});

describe('session restore', () => {
  it('drops a stored session the Worker no longer recognises', async () => {
    mockStore.set('dfd_session', JSON.stringify({ token: TOKEN, user: profile }));
    const api = fakeApi({ session: jest.fn(() => ok({ user: null })) });
    await render(withSession(api, <Status />));
    await waitFor(() => expect(screen.getByText('signedOut')).toBeTruthy());
    expect(mockStore.has('dfd_session')).toBe(false);
  });

  it('keeps a stored session when the network is down', async () => {
    mockStore.set('dfd_session', JSON.stringify({ token: TOKEN, user: profile }));
    const api = fakeApi({ session: jest.fn(() => fail(0, 'offline')) });
    await render(withSession(api, <Status />));
    await waitFor(() => expect(api.session).toHaveBeenCalledWith(TOKEN));
    expect(screen.getByText('signedIn')).toBeTruthy();
    expect(mockStore.has('dfd_session')).toBe(true);
  });
});

describe('sign in', () => {
  it('asks for both fields before calling the Worker', async () => {
    const api = fakeApi();
    await render(withSession(api, <SignIn />));
    await fireEvent.press(await screen.findByTestId('sign-in-submit'));
    expect(screen.getByText('Enter your email or username.')).toBeTruthy();
    expect(screen.getByText('Enter your password.')).toBeTruthy();
    expect(api.login).not.toHaveBeenCalled();
  });

  it('accepts the short dummy password and stores the session securely', async () => {
    const api = fakeApi();
    await render(withSession(api, <SignIn />));
    await fireEvent.changeText(await screen.findByTestId('sign-in-login'), ' Dummy ');
    await fireEvent.changeText(screen.getByTestId('sign-in-password'), 'dummy');
    await fireEvent.press(screen.getByTestId('sign-in-submit'));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(api.login).toHaveBeenCalledWith('dummy', 'dummy');
    expect(JSON.parse(mockStore.get('dfd_session') ?? 'null')).toEqual({ token: TOKEN, user: profile });
  });

  it('sends an unconfirmed account to the code screen', async () => {
    const api = fakeApi({ login: jest.fn(() => fail(403, 'Confirm your email first.', { needsVerification: true, email: 'new@b.co' })) });
    await render(withSession(api, <SignIn />));
    await fireEvent.changeText(await screen.findByTestId('sign-in-login'), 'new@b.co');
    await fireEvent.changeText(screen.getByTestId('sign-in-password'), 'password1');
    await fireEvent.press(screen.getByTestId('sign-in-submit'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/verify', params: { email: 'new@b.co' } }));
  });

  it('shows the Worker message on a wrong password', async () => {
    const api = fakeApi({ login: jest.fn(() => fail(401, 'Invalid email or password.')) });
    await render(withSession(api, <SignIn />));
    await fireEvent.changeText(await screen.findByTestId('sign-in-login'), 'a@b.co');
    await fireEvent.changeText(screen.getByTestId('sign-in-password'), 'wrong');
    await fireEvent.press(screen.getByTestId('sign-in-submit'));
    expect(await screen.findByText('Invalid email or password.')).toBeTruthy();
    expect(mockStore.has('dfd_session')).toBe(false);
  });
});

describe('password reset', () => {
  it('requests a code, then resets with code and new password', async () => {
    const api = fakeApi();
    await render(withSession(api, <ForgotPassword />));
    await fireEvent.changeText(await screen.findByTestId('reset-email'), 'A@B.co');
    await fireEvent.press(screen.getByTestId('reset-send'));
    await waitFor(() => expect(api.forgotPassword).toHaveBeenCalledWith('a@b.co'));
    await fireEvent.changeText(await screen.findByTestId('reset-code'), '12a3456');
    await fireEvent.changeText(screen.getByTestId('reset-password'), 'short');
    await fireEvent.press(screen.getByTestId('reset-save'));
    expect(screen.getByText('Use at least 8 characters.')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('reset-password'), 'long enough');
    await fireEvent.press(screen.getByTestId('reset-save'));
    await waitFor(() => expect(api.resetPassword).toHaveBeenCalledWith('a@b.co', '123456', 'long enough'));
    expect(await screen.findByTestId('reset-done')).toBeTruthy();
  });
});

describe('lesson viewer', () => {
  async function openLesson(path: string) {
    mockParams = { path, title: 'Lesson' };
    mockStore.set('dfd_session', JSON.stringify({ token: TOKEN, user: profile }));
    const api = fakeApi();
    await render(withSession(api, <Learn />));
    await waitFor(() => expect(mockWebViewRef.current).not.toBeNull());
    return { api, props: mockWebViewRef.current as Record<string, unknown> };
  }

  it('loads only the site with hardened settings', async () => {
    const { props } = await openLesson('snowflake_course/architecture.html');
    expect(props.source).toEqual({ uri: 'https://datafordummies.in/snowflake_course/architecture.html' });
    expect(props.originWhitelist).toEqual(['*']);
    expect(props).toMatchObject({
      allowFileAccess: false,
      allowFileAccessFromFileURLs: false,
      allowUniversalAccessFromFileURLs: false,
      javaScriptCanOpenWindowsAutomatically: false,
      setSupportMultipleWindows: false,
      mixedContentMode: 'never',
      geolocationEnabled: false,
      mediaCapturePermissionGrantType: 'deny',
      thirdPartyCookiesEnabled: false,
      sharedCookiesEnabled: false,
      paymentRequestEnabled: false,
      injectedJavaScriptBeforeContentLoadedForMainFrameOnly: true,
    });
    expect(String(props.injectedJavaScriptBeforeContentLoaded)).toContain(TOKEN);
  });

  it('routes pricing to the native policy and blocks hostile schemes', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { props } = await openLesson('python_course/s5-sets-dicts.html');
    const decide = props.onShouldStartLoadWithRequest as (request: { url: string; isTopFrame?: boolean }) => boolean;
    expect(decide({ url: 'https://datafordummies.in/python_course/s6-functions.html', isTopFrame: true })).toBe(true);
    expect(decide({ url: 'https://datafordummies.in/pricing.html', isTopFrame: true })).toBe(false);
    expect(mockRouter.push).toHaveBeenCalledWith('/pro');
    expect(decide({ url: 'intent://x#Intent;end', isTopFrame: true })).toBe(false);
    expect(decide({ url: 'https://evil.example/', isTopFrame: true })).toBe(false);
    expect(alert).toHaveBeenCalled();
    alert.mockRestore();
  });

  it('ends the native session when the website signs out', async () => {
    const { props } = await openLesson('auth/profile.html');
    const onMessage = props.onMessage as (event: { nativeEvent: { data: string; url: string } }) => void;
    await act(async () => {
      onMessage({ nativeEvent: { data: '{"type":"dfd:signed-out"}', url: 'https://evil.example/' } });
    });
    expect(mockStore.has('dfd_session')).toBe(true);
    await act(async () => {
      onMessage({ nativeEvent: { data: '{"type":"dfd:signed-out"}', url: 'https://datafordummies.in/auth/profile.html' } });
      await Promise.resolve();
    });
    await waitFor(() => expect(mockStore.has('dfd_session')).toBe(false));
  });

  it('refuses a path that leaves the site', async () => {
    await cleanup();
    mockParams = { path: '//evil.example/x.html' };
    const view = await render(withSession(fakeApi(), <Learn />));
    expect(view.getByText('That page is not on datafordummies.in, so the app will not open it.')).toBeTruthy();
    expect(mockWebViewRef.current).toBeNull();
  });
});

const learner: Profile = {
  ...profile,
  id: 'learner-1',
  email: 'learner@example.com',
  username: 'learner',
  subscription_status: 'free',
};

describe('account deletion', () => {
  function holdSession() {
    let release: (result: Awaited<ReturnType<ApiClient['session']>>) => void = () => undefined;
    const pending = new Promise<Awaited<ReturnType<ApiClient['session']>>>((resolve) => {
      release = resolve;
    });
    return { pending, release };
  }

  it('keeps the saved session when the server refuses', async () => {
    mockStore.set('dfd_session', JSON.stringify({ token: TOKEN, user: learner }));
    const api = fakeApi({
      session: jest.fn(() => ok({ user: learner })),
      deleteAccount: jest.fn(() => fail(401, 'That password does not match this account.')),
    });
    await render(withSession(api, <DeleteAccount />));
    await fireEvent.changeText(await screen.findByTestId('delete-password'), 'password12');
    await fireEvent.changeText(screen.getByTestId('delete-phrase'), 'DELETE');
    await fireEvent.press(screen.getByTestId('delete-submit'));
    expect(await screen.findByTestId('delete-error')).toBeTruthy();
    expect(api.deleteAccount).toHaveBeenCalledWith('password12', 'DELETE');
    expect(mockStore.get('dfd_session')).toContain('learner-1');
  });

  it('clears the saved session only after the server deletes the account', async () => {
    mockStore.set('dfd_session', JSON.stringify({ token: TOKEN, user: learner }));
    const held = holdSession();
    const api = fakeApi({
      session: jest.fn(() => held.pending),
      deleteAccount: jest.fn(() => ok({ ok: true as const })),
    });
    await render(withSession(api, <DeleteAccount />));
    await fireEvent.changeText(await screen.findByTestId('delete-password'), 'password12');
    await fireEvent.changeText(screen.getByTestId('delete-phrase'), 'DELETE');
    await fireEvent.press(screen.getByTestId('delete-submit'));
    expect(await screen.findByTestId('delete-done')).toBeTruthy();
    expect(mockStore.has('dfd_session')).toBe(false);
    await act(async () => {
      held.release({ ok: true, data: { user: learner } });
      await held.pending;
    });
    expect(mockStore.has('dfd_session')).toBe(false);
  });
});
