import vm from 'node:vm';

import type { Profile, WebSession } from '../src/lib/types';
import { buildSessionScript, parseBridgeMessage, SIGNED_OUT_MESSAGE } from '../src/lib/web-bridge';

const user: Profile = {
  id: 'u1',
  email: 'learner@example.com',
  username: null,
  full_name: 'Ana </script><script>alert(1)</script>\u2028x',
  phone: null,
  country_code: null,
  role: 'student',
  subscription_status: 'active',
  subscription_plan: 'monthly',
  subscription_end_date: '2099-01-01T00:00:00.000Z',
  subscription_cancel_at_cycle_end: false,
  updated_at: null,
};

const session: WebSession = { token: 'a'.repeat(64), user };

class FakeStorage {
  private items = new Map<string, string>();
  getItem(key: string) {
    return this.items.has(key) ? (this.items.get(key) as string) : null;
  }
  setItem(key: string, value: string) {
    this.items.set(key, String(value));
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
}

function runInPage(script: string, href: string, existing?: string) {
  const url = new URL(href);
  const localStorage = new FakeStorage();
  if (existing) localStorage.setItem('dfd_session', existing);
  const posted: string[] = [];
  const window: Record<string, unknown> = {
    localStorage,
    ReactNativeWebView: { postMessage: (data: string) => posted.push(data) },
  };
  const context = vm.createContext({
    window,
    location: { protocol: url.protocol, hostname: url.hostname },
    Storage: FakeStorage,
    JSON,
  });
  const result = vm.runInContext(script, context);
  return { localStorage, posted, result };
}

describe('buildSessionScript', () => {
  it('writes the dfd_session object js/supabase-auth.js reads', () => {
    const page = runInPage(buildSessionScript(session), 'https://datafordummies.in/snowflake_course/architecture.html');
    expect(JSON.parse(page.localStorage.getItem('dfd_session') ?? 'null')).toEqual({ token: session.token, user });
    expect(page.result).toBe(true);
  });

  it('writes on www as well', () => {
    const page = runInPage(buildSessionScript(session), 'https://www.datafordummies.in/index.html');
    expect(page.localStorage.getItem('dfd_session')).not.toBeNull();
  });

  it('never writes the token on another origin or over http', () => {
    for (const href of ['https://evil.example/', 'http://datafordummies.in/', 'https://datafordummies.in.evil.example/']) {
      const page = runInPage(buildSessionScript(session), href);
      expect(page.localStorage.getItem('dfd_session')).toBeNull();
    }
  });

  it('clears a stale web session when the app is signed out', () => {
    const page = runInPage(buildSessionScript(null), 'https://datafordummies.in/index.html', '{"token":"old"}');
    expect(page.localStorage.getItem('dfd_session')).toBeNull();
    expect(page.posted).toEqual([]);
  });

  it('reports a sign-out made by the website', () => {
    const page = runInPage(buildSessionScript(session), 'https://datafordummies.in/auth/profile.html');
    page.localStorage.removeItem('other_key');
    expect(page.posted).toEqual([]);
    page.localStorage.removeItem('dfd_session');
    expect(page.posted).toEqual([JSON.stringify({ type: SIGNED_OUT_MESSAGE })]);
  });

  it('keeps hostile profile text inert', () => {
    const script = buildSessionScript(session);
    expect(script).not.toContain('</script>');
    expect(script).not.toContain('\u2028');
    const page = runInPage(script, 'https://datafordummies.in/index.html');
    const stored = JSON.parse(page.localStorage.getItem('dfd_session') ?? 'null') as WebSession;
    expect(stored.user.full_name).toBe(user.full_name);
  });
});

describe('parseBridgeMessage', () => {
  const data = JSON.stringify({ type: SIGNED_OUT_MESSAGE });

  it('accepts the sign-out message from the site', () => {
    expect(parseBridgeMessage(data, 'https://datafordummies.in/index.html')).toEqual({ type: SIGNED_OUT_MESSAGE });
  });

  it('ignores other origins, other types and junk', () => {
    expect(parseBridgeMessage(data, 'https://evil.example/')).toBeNull();
    expect(parseBridgeMessage(data, 'http://datafordummies.in/')).toBeNull();
    expect(parseBridgeMessage('{"type":"dfd:grant-pro"}', 'https://datafordummies.in/')).toBeNull();
    expect(parseBridgeMessage('not json', 'https://datafordummies.in/')).toBeNull();
    expect(parseBridgeMessage('null', 'https://datafordummies.in/')).toBeNull();
  });
});
