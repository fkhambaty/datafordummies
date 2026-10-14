import type { Profile } from './types';

export type Access = 'admin' | 'pro' | 'free';

/**
 * Same rule as js/paywall.js and isActiveProfile() in the Worker. The server stays the
 * authority: lesson pages re-check /v1/profile before they hide the paywall.
 */
export function accessFor(profile: Profile | null, now: Date = new Date()): Access {
  if (!profile) return 'free';
  if (profile.role === 'admin') return 'admin';
  const status = profile.subscription_status;
  if (status !== 'active' && status !== 'pro') return 'free';
  if (profile.subscription_end_date) {
    const end = Date.parse(profile.subscription_end_date);
    if (Number.isNaN(end) || end <= now.getTime()) return 'free';
  }
  return 'pro';
}

export function describeAccess(profile: Profile | null, now: Date = new Date()): string {
  const access = accessFor(profile, now);
  if (access === 'admin') return 'Owner account. Every lesson is open.';
  if (access === 'free') return 'Free plan. Free lessons are open. Pro lessons show a lock.';
  const end = profile?.subscription_end_date ? new Date(profile.subscription_end_date) : null;
  const date = end
    ? end.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  if (profile?.subscription_cancel_at_cycle_end && date) return `Pro until ${date}. It will not renew.`;
  return date ? `Pro. Current period ends ${date}.` : 'Pro.';
}
