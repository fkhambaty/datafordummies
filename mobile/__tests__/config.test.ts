import fs from 'node:fs';
import path from 'node:path';

import appConfig from '../app.config';
import { API_BASE, LEGAL_PAGES, SITE_ORIGIN, WEB_SESSION_KEY } from '../src/lib/config';

const MOBILE = path.resolve(__dirname, '..');
const SITE = path.resolve(MOBILE, '..');

function read(relative: string): string {
  return fs.readFileSync(path.join(SITE, relative), 'utf8');
}

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|js|json)$/u.test(entry.name) ? [full] : [];
  });
}

describe('shared contract with the website', () => {
  it('uses the same public API base as js/supabase-config.js', () => {
    expect(read('js/supabase-config.js')).toContain(`'${API_BASE}'`);
  });

  it('uses the same localStorage key as js/supabase-auth.js', () => {
    expect(read('js/supabase-auth.js')).toContain(`var STORAGE_KEY = '${WEB_SESSION_KEY}';`);
  });

  it('serves from the production CNAME', () => {
    expect(SITE_ORIGIN).toBe(`https://${read('CNAME').trim()}`);
  });

  it('links legal pages that exist', () => {
    for (const page of LEGAL_PAGES) expect(fs.existsSync(path.join(SITE, page.path))).toBe(true);
  });
});

describe('app config', () => {
  it('uses the real package ids', () => {
    expect(appConfig.ios?.bundleIdentifier).toBe('in.datafordummies.app');
    expect(appConfig.android?.package).toBe('in.datafordummies.app');
    expect(appConfig.scheme).toBe('datafordummies');
    expect(appConfig.android?.allowBackup).toBe(false);
  });

  it('points at generated assets that exist', () => {
    const assets = [
      appConfig.icon,
      appConfig.android?.adaptiveIcon?.foregroundImage,
      appConfig.android?.adaptiveIcon?.backgroundImage,
      appConfig.android?.adaptiveIcon?.monochromeImage,
      './assets/splash-icon.png',
      './assets/logo.png',
    ];
    for (const asset of assets) {
      expect(typeof asset).toBe('string');
      expect(fs.existsSync(path.join(MOBILE, String(asset)))).toBe(true);
    }
  });
});

describe('no secrets and no checkout in the app', () => {
  const files = [...sourceFiles(path.join(MOBILE, 'src')), path.join(MOBILE, 'app.config.ts'), path.join(MOBILE, 'eas.json')];
  const text = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');

  it.each([
    /rzp_(live|test)_/u,
    /plan_[A-Za-z0-9]{10,}/u,
    /re_[A-Za-z0-9]{20,}/u,
    /RAZORPAY_(KEY_SECRET|WEBHOOK_SECRET)/u,
    /RESEND_API_KEY/u,
    /checkout\.razorpay\.com\/v1\/checkout\.js/u,
    /createSubscription|payments\/razorpay\/subscriptions/u,
  ])('does not contain %s', (pattern) => {
    expect(text).not.toMatch(pattern);
  });
});
