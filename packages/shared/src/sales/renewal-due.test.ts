import { describe, expect, it } from 'vitest';
import { DEFAULT_RENEWAL_PRICING, quote, type QuoteOptions, type QuoteResponse } from '../money/pricing/index.js';
import { salesRenewal, type RenewalPackage, type SalesRenewalInput } from './renewal-due.js';

const source = (o: QuoteOptions): QuoteResponse => ({ ...quote(o), fx: null });
const pkg = (o: QuoteOptions, price = 145): RenewalPackage => ({ duration: o.duration, lessons_total: 8, price, price_source: source(o) });
const PREMIUM = pkg({ tier: 'premium', duration: 60, country: 'AE', students: 1, discount: 10 });
const base: SalesRenewalInput = { status: 'active', remaining: 6, threshold: 2, packages: [PREMIUM] };

describe('salesRenewal: renew_due', () => {
  it('pending_renewal and expired are due whatever is left', () => {
    expect(salesRenewal({ ...base, status: 'pending_renewal' }).renew_due).toBe(true);
    expect(salesRenewal({ ...base, status: 'expired', remaining: 9 }).renew_due).toBe(true);
  });

  it('active: due at or under the renewal-alert threshold, not above it', () => {
    expect(salesRenewal({ ...base, remaining: 2 }).renew_due).toBe(true);
    expect(salesRenewal({ ...base, remaining: 0 }).renew_due).toBe(true);
    expect(salesRenewal({ ...base, remaining: 3 }).renew_due).toBe(false);
    expect(salesRenewal({ ...base, remaining: 3, threshold: 4 }).renew_due).toBe(true);
  });

  it('a not-yet-subscribed, paused or churned student is never due', () => {
    for (const status of ['new', 'trial', 'pending_subscription', 'paused', 'churned'] as const) {
      expect(salesRenewal({ ...base, status, remaining: 0 }).renew_due).toBe(false);
    }
  });
});

describe('salesRenewal: the seed (renewalPricing of the last priced package)', () => {
  it('tier, duration, pill discount and country of the last package', () => {
    expect(salesRenewal(base).renewal).toEqual({ pkg: 'premium', count: DEFAULT_RENEWAL_PRICING.count, duration: 60, discount: 10, country: 'AE' });
  });

  it('the last PRICED package: a later trial (price 0) is skipped', () => {
    const trial = pkg({ count: 1, duration: 30, country: 'SA', students: 1, discount: 0 }, 0);
    const custom = pkg({ count: 14, duration: 45, country: 'KW', students: 1, discount: 5 });
    expect(salesRenewal({ ...base, packages: [PREMIUM, custom, trial] }).renewal).toEqual({ pkg: 'custom', count: 14, duration: 45, discount: 5, country: 'KW' });
  });

  it('a free-field discount (not a pill) is dropped; the rest stays', () => {
    const odd = pkg({ tier: 'standard', duration: 45, country: 'SA', students: 1, discount: 12.5 });
    expect(salesRenewal({ ...base, packages: [odd] }).renewal).toMatchObject({ pkg: 'standard', duration: 45, discount: 0, country: 'SA' });
  });

  it('no priced package: the calculator defaults', () => {
    expect(salesRenewal({ ...base, packages: [] }).renewal).toEqual(DEFAULT_RENEWAL_PRICING);
  });
});
