import { SITE_HOSTS, SITE_ORIGIN } from './config';

export type NativeRoute =
  | '/sign-in'
  | '/sign-up'
  | '/verify'
  | '/forgot-password'
  | '/account'
  | '/pro';

export type NavigationDecision =
  | { kind: 'allow' }
  | { kind: 'redirect'; url: string }
  | { kind: 'native'; route: NativeRoute }
  | { kind: 'download'; url: string }
  | { kind: 'external'; url: string }
  | { kind: 'block'; reason: string };

const SITE_ROUTES: Record<string, NativeRoute> = {
  '/pricing.html': '/pro',
  '/pricing': '/pro',
  '/auth/login.html': '/sign-in',
  '/auth/signup.html': '/sign-up',
  '/auth/verify.html': '/verify',
  '/auth/reset-password.html': '/forgot-password',
  '/auth/update-password.html': '/forgot-password',
  '/auth/confirm.html': '/account',
  '/auth/profile.html': '/account',
};

const PAYMENT_HOSTS = ['razorpay.com', 'razorpay.me', 'rzp.io'];

const DOWNLOAD_EXTENSIONS = /\.(csv|xlsx?|sql|zip|pdf|ipynb|py|parquet|docx|pptx|apk)$/iu;

function isSiteHost(hostname: string): boolean {
  return SITE_HOSTS.includes(hostname.toLowerCase());
}

function isPaymentHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return PAYMENT_HOSTS.some((payment) => host === payment || host.endsWith(`.${payment}`));
}

function parse(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/**
 * Turns a site-relative path such as "snowflake_course/hub.html" into an absolute
 * datafordummies.in URL. Anything that would leave the site returns null.
 */
export function siteUrl(path: string): string | null {
  const trimmed = path.trim();
  if (!trimmed || trimmed.includes('\\') || /[\u0000-\u001f]/u.test(trimmed)) return null;
  if (/^[a-z][a-z0-9+.-]*:/iu.test(trimmed) || trimmed.startsWith('//')) return null;
  const url = parse(`${SITE_ORIGIN}/${trimmed.replace(/^\/+/u, '')}`);
  if (!url || url.origin !== SITE_ORIGIN) return null;
  return url.toString();
}

/** Site path ("python_course/s1-intro.html") for a datafordummies.in URL, else null. */
export function sitePathOf(url: string): string | null {
  const parsed = parse(url);
  if (!parsed || parsed.protocol !== 'https:' || !isSiteHost(parsed.hostname)) return null;
  return parsed.pathname.replace(/^\/+/u, '');
}

export function decideNavigation(url: string, isTopFrame = true): NavigationDecision {
  if (url === 'about:blank' || url === 'about:srcdoc') return { kind: 'allow' };
  const parsed = parse(url);
  if (!parsed) return { kind: 'block', reason: 'That link is not a valid address.' };

  if (parsed.protocol === 'https:' && isSiteHost(parsed.hostname)) {
    if (!isTopFrame) return { kind: 'allow' };
    const route = SITE_ROUTES[parsed.pathname.toLowerCase()];
    if (route) return { kind: 'native', route };
    if (DOWNLOAD_EXTENSIONS.test(parsed.pathname)) return { kind: 'download', url: parsed.toString() };
    return { kind: 'allow' };
  }

  if (!isTopFrame) return { kind: 'block', reason: 'Embedded content from other sites is not loaded in the app.' };

  if (parsed.protocol === 'http:' && isSiteHost(parsed.hostname)) {
    parsed.protocol = 'https:';
    return { kind: 'redirect', url: parsed.toString() };
  }

  if ((parsed.protocol === 'https:' || parsed.protocol === 'http:') && isPaymentHost(parsed.hostname)) {
    return { kind: 'native', route: '/pro' };
  }

  if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'mailto:') {
    return { kind: 'external', url: parsed.toString() };
  }

  if (parsed.protocol === 'blob:' || parsed.protocol === 'data:') {
    return { kind: 'block', reason: 'File exports are not available in the app. Use the website on a computer to export.' };
  }

  return { kind: 'block', reason: 'The app does not open that kind of link.' };
}
