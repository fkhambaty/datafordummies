import { createApi, OFFLINE_MESSAGE } from '../src/lib/api';

type Call = { url: string; init: RequestInit };

function fakeFetch(status: number, body: unknown, calls: Call[]): typeof fetch {
  return (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => {
        if (body instanceof Error) throw body;
        return body;
      },
    } as Response;
  }) as unknown as typeof fetch;
}

describe('createApi', () => {
  it('posts login to the Worker without a token', async () => {
    const calls: Call[] = [];
    const api = createApi({ baseUrl: 'https://api.test', fetchImpl: fakeFetch(200, { token: 't', user: { id: 'u' } }, calls), getToken: () => null });
    const result = await api.login('dummy', 'dummy');
    expect(result).toEqual({ ok: true, data: { token: 't', user: { id: 'u' } } });
    expect(calls[0]?.url).toBe('https://api.test/v1/login');
    expect(calls[0]?.init.method).toBe('POST');
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({ email: 'dummy', password: 'dummy' });
    expect((calls[0]?.init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('sends a confirmed deletion with the bearer token', async () => {
    const calls: Call[] = [];
    const api = createApi({ baseUrl: 'https://api.test', fetchImpl: fakeFetch(200, { ok: true }, calls), getToken: () => 'abc' });
    const result = await api.deleteAccount('password12', 'DELETE');
    expect(result).toEqual({ ok: true, data: { ok: true } });
    expect(calls[0]?.url).toBe('https://api.test/v1/account');
    expect(calls[0]?.init.method).toBe('DELETE');
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({ password: 'password12', confirmation: 'DELETE' });
    expect((calls[0]?.init.headers as Record<string, string>).Authorization).toBe('Bearer abc');
  });

  it('sends the bearer token on account calls', async () => {
    const calls: Call[] = [];
    const api = createApi({ baseUrl: 'https://api.test', fetchImpl: fakeFetch(200, { progress: [] }, calls), getToken: () => 'abc' });
    await api.progress();
    expect(calls[0]?.url).toBe('https://api.test/v1/progress');
    expect((calls[0]?.init.headers as Record<string, string>).Authorization).toBe('Bearer abc');
  });

  it('uses an explicit token for session checks and logout', async () => {
    const calls: Call[] = [];
    const api = createApi({ baseUrl: 'https://api.test', fetchImpl: fakeFetch(200, { user: null }, calls), getToken: () => null });
    await api.session('stored');
    await api.logout('stored');
    expect(calls.map((call) => (call.init.headers as Record<string, string>).Authorization)).toEqual(['Bearer stored', 'Bearer stored']);
  });

  it('keeps the Worker error and verification hint', async () => {
    const api = createApi({
      baseUrl: 'https://api.test',
      fetchImpl: fakeFetch(403, { error: 'Confirm your email first. We sent you a code.', needs_verification: true, email: 'a@b.co' }, []),
      getToken: () => null,
    });
    const result = await api.login('a@b.co', 'password1');
    expect(result).toMatchObject({ ok: false, status: 403, needsVerification: true, email: 'a@b.co' });
  });

  it('keeps the missing lesson list on certificate refusal', async () => {
    const api = createApi({ baseUrl: 'https://api.test', fetchImpl: fakeFetch(409, { error: 'Not yet', missing: ['a', 'b', 3] }, []), getToken: () => 't' });
    const result = await api.requestCertificate('snowflake');
    expect(result).toMatchObject({ ok: false, status: 409, missing: ['a', 'b'] });
  });

  it('passes the D1 daily-limit 503 message through', async () => {
    const message = "Accounts and saved progress are temporarily unavailable because today's storage allowance has been reached.";
    const api = createApi({ baseUrl: 'https://api.test', fetchImpl: fakeFetch(503, { error: message }, []), getToken: () => 't' });
    expect(await api.progress()).toMatchObject({ ok: false, status: 503, message });
  });

  it('survives a non-JSON error body', async () => {
    const api = createApi({ baseUrl: 'https://api.test', fetchImpl: fakeFetch(502, new Error('html'), []), getToken: () => null });
    expect(await api.forgotPassword('a@b.co')).toMatchObject({ ok: false, status: 502, message: 'Request failed.' });
  });

  it('reports a network failure as status 0', async () => {
    const failing = (async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    const api = createApi({ baseUrl: 'https://api.test', fetchImpl: failing, getToken: () => null });
    expect(await api.resendCode('a@b.co')).toMatchObject({ ok: false, status: 0, message: OFFLINE_MESSAGE });
  });

  it('aborts a request that takes too long', async () => {
    const hanging = ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      })) as unknown as typeof fetch;
    const api = createApi({ baseUrl: 'https://api.test', fetchImpl: hanging, getToken: () => null, timeoutMs: 10 });
    expect(await api.profile()).toMatchObject({ ok: false, status: 0 });
  });
});
