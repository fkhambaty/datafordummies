import { accessFor, describeAccess } from '../src/lib/entitlement';
import type { Profile } from '../src/lib/types';

const now = new Date('2026-10-14T12:00:00.000Z');

function profile(overrides: Partial<Profile>): Profile {
  return {
    id: 'u1',
    email: 'learner@example.com',
    username: null,
    full_name: null,
    phone: null,
    country_code: null,
    role: 'student',
    subscription_status: null,
    subscription_plan: null,
    subscription_end_date: null,
    subscription_cancel_at_cycle_end: false,
    updated_at: null,
    ...overrides,
  };
}

describe('accessFor', () => {
  it('matches the paywall rule', () => {
    expect(accessFor(null, now)).toBe('free');
    expect(accessFor(profile({}), now)).toBe('free');
    expect(accessFor(profile({ subscription_status: 'pending' }), now)).toBe('free');
    expect(accessFor(profile({ subscription_status: 'cancelled' }), now)).toBe('free');
    expect(accessFor(profile({ subscription_status: 'active' }), now)).toBe('pro');
    expect(accessFor(profile({ subscription_status: 'pro', subscription_end_date: '2026-10-20T00:00:00Z' }), now)).toBe('pro');
    expect(accessFor(profile({ subscription_status: 'active', subscription_end_date: '2026-10-01T00:00:00Z' }), now)).toBe('free');
    expect(accessFor(profile({ subscription_status: 'active', subscription_end_date: 'garbage' }), now)).toBe('free');
    expect(accessFor(profile({ role: 'admin' }), now)).toBe('admin');
  });
});

describe('describeAccess', () => {
  it('states the plan without inventing dates', () => {
    expect(describeAccess(profile({}), now)).toMatch(/^Free plan/u);
    expect(describeAccess(profile({ subscription_status: 'active' }), now)).toBe('Pro.');
    expect(
      describeAccess(profile({ subscription_status: 'active', subscription_end_date: '2026-11-01T00:00:00Z', subscription_cancel_at_cycle_end: true }), now),
    ).toMatch(/will not renew/u);
  });
});
