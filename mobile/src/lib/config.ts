/** Public values only. The same API base is window.DFD_API in js/supabase-config.js. */
export const API_BASE = 'https://datafordummies-api.fkhambaty.workers.dev';

export const SITE_ORIGIN = 'https://datafordummies.in';

export const SITE_HOSTS: readonly string[] = ['datafordummies.in', 'www.datafordummies.in'];

/** localStorage key read by js/supabase-auth.js. */
export const WEB_SESSION_KEY = 'dfd_session';

export const CONTACT_EMAIL = 'fktiindia@gmail.com';

export const REQUEST_TIMEOUT_MS = 15000;

export const LEGAL_PAGES = [
  { path: 'privacy.html', label: 'Privacy policy' },
  { path: 'terms.html', label: 'Terms of use' },
  { path: 'cancellation.html', label: 'Cancellation policy' },
  { path: 'refunds.html', label: 'Refund policy' },
] as const;
