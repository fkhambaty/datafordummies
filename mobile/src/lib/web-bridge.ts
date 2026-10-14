import { SITE_HOSTS, WEB_SESSION_KEY } from './config';
import { sitePathOf } from './url-policy';
import type { WebSession } from './types';

export const SIGNED_OUT_MESSAGE = 'dfd:signed-out';

export type BridgeMessage = { type: typeof SIGNED_OUT_MESSAGE };

/** JSON is valid JavaScript, but U+2028/U+2029 and "<" are escaped so the literal stays inert. */
function scriptLiteral(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</gu, '\\u003c')
    .replace(/\u2028/gu, '\\u2028')
    .replace(/\u2029/gu, '\\u2029');
}

/**
 * Runs before page scripts on every top-frame load. It writes the same dfd_session
 * object js/supabase-auth.js reads, only on datafordummies.in, and reports a web
 * sign-out so the native session ends with it.
 */
export function buildSessionScript(session: WebSession | null): string {
  const value = session ? { token: session.token, user: session.user } : null;
  return `(function () {
  try {
    var hosts = ${scriptLiteral(SITE_HOSTS)};
    if (location.protocol !== 'https:' || hosts.indexOf(location.hostname) === -1) return;
    var key = ${scriptLiteral(WEB_SESSION_KEY)};
    var value = ${scriptLiteral(value)};
    if (value) window.localStorage.setItem(key, JSON.stringify(value));
    else window.localStorage.removeItem(key);
    if (!value || window.__dfdBridge) return;
    window.__dfdBridge = true;
    var remove = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function (name) {
      var result = remove.apply(this, arguments);
      if (this === window.localStorage && name === key && window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: ${scriptLiteral(SIGNED_OUT_MESSAGE)} }));
      }
      return result;
    };
  } catch (error) {}
})();
true;`;
}

/** Accepts a message only when the page that sent it is on datafordummies.in. */
export function parseBridgeMessage(data: string, sourceUrl: string): BridgeMessage | null {
  if (sitePathOf(sourceUrl) === null) return null;
  try {
    const parsed: unknown = JSON.parse(data);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as { type?: unknown }).type === SIGNED_OUT_MESSAGE
    ) {
      return { type: SIGNED_OUT_MESSAGE };
    }
  } catch {
    return null;
  }
  return null;
}
