import { API_BASE, REQUEST_TIMEOUT_MS } from './config';
import type { CertificateRequest, CourseProgress, Profile } from './types';

export type ApiFailure = {
  ok: false;
  status: number;
  message: string;
  needsVerification: boolean;
  email: string;
  missing: string[];
};

export type ApiResult<T> = { ok: true; data: T } | ApiFailure;

export type ApiClient = ReturnType<typeof createApi>;

type Options = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  getToken: () => string | null;
};

type Body = Record<string, unknown>;

export const OFFLINE_MESSAGE = 'The account service did not answer. Check your connection and try again.';

function failure(status: number, body: Body, fallback: string): ApiFailure {
  return {
    ok: false,
    status,
    message: typeof body.error === 'string' && body.error ? body.error : fallback,
    needsVerification: body.needs_verification === true,
    email: typeof body.email === 'string' ? body.email : '',
    missing: Array.isArray(body.missing) ? body.missing.filter((item): item is string => typeof item === 'string') : [],
  };
}

export function createApi({ baseUrl = API_BASE, fetchImpl = fetch, timeoutMs = REQUEST_TIMEOUT_MS, getToken }: Options) {
  async function request<T>(path: string, init: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: Body; token?: string } = {}): Promise<ApiResult<T>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const token = init.token ?? getToken();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (init.body) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method: init.method ?? 'GET',
        headers,
        body: init.body ? JSON.stringify(init.body) : undefined,
        signal: controller.signal,
      });
      let body: Body = {};
      try {
        const parsed: unknown = await response.json();
        if (parsed && typeof parsed === 'object') body = parsed as Body;
      } catch {
        body = {};
      }
      if (!response.ok) return failure(response.status, body, 'Request failed.');
      return { ok: true, data: body as T };
    } catch {
      return failure(0, {}, OFFLINE_MESSAGE);
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    login: (login: string, password: string) =>
      request<{ token: string; user: Profile }>('/v1/login', { method: 'POST', body: { email: login, password } }),
    signup: (input: { email: string; password: string; fullName: string }) =>
      request<{ needs_verification: true; email: string }>('/v1/signup', {
        method: 'POST',
        body: { email: input.email, password: input.password, full_name: input.fullName, phone: '', country_code: '' },
      }),
    verify: (email: string, code: string) =>
      request<{ token: string; user: Profile }>('/v1/verify', { method: 'POST', body: { email, code } }),
    resendCode: (email: string) => request<{ ok: true }>('/v1/resend-code', { method: 'POST', body: { email } }),
    forgotPassword: (email: string) => request<{ ok: true }>('/v1/forgot-password', { method: 'POST', body: { email } }),
    resetPassword: (email: string, code: string, password: string) =>
      request<{ ok: true }>('/v1/reset-password', { method: 'POST', body: { email, code, password } }),
    logout: (token: string) => request<{ ok: true }>('/v1/logout', { method: 'POST', body: {}, token }),
    deleteAccount: (password: string, confirmation: string) =>
      request<{ ok: true }>('/v1/account', { method: 'DELETE', body: { password, confirmation } }),
    session: (token: string) => request<{ user: Profile | null }>('/v1/session', { token }),
    profile: () => request<{ profile: Profile }>('/v1/profile'),
    progress: () => request<{ progress: CourseProgress[] }>('/v1/progress'),
    certificates: () => request<{ certificates: CertificateRequest[] }>('/v1/certificates'),
    requestCertificate: (courseId: string) =>
      request<{ certificate: CertificateRequest }>('/v1/certificates', { method: 'POST', body: { course_id: courseId } }),
  };
}
