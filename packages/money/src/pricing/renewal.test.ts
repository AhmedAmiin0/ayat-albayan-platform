import { describe, expect, it } from 'vitest';
import { quote, type QuoteOptions, type QuoteResponse } from './quote.js';
import { DEFAULT_RENEWAL_PRICING, renewalPricing, type LastPackage } from './renewal.js';

const source = (o: QuoteOptions): QuoteResponse => ({ ...quote(o), fx: null });

const WEEKLY: LastPackage = {
  duration: 90,
  lessons_total: 4,
  price_source: source({ tier: 'weekly', duration: 45, country: 'SA', students: 1, discount: 0 }),
};

describe('renewalPricing («جدّد الاشتراك» from the last package)', () => {
  it('no last package: the calculator defaults', () => {
    expect(renewalPricing(null)).toEqual(DEFAULT_RENEWAL_PRICING);
    expect(renewalPricing(undefined)).toEqual(DEFAULT_RENEWAL_PRICING);
  });

  it('a tier keeps its tier, duration, discount and country', () => {
    const last = { ...WEEKLY, duration: 60 as const, price_source: source({ tier: 'premium', duration: 60, country: 'AE', students: 1, discount: 10 }) };
    expect(renewalPricing(last)).toEqual({ pkg: 'premium', count: DEFAULT_RENEWAL_PRICING.count, duration: 60, discount: 10, country: 'AE' });
  });

  it('a custom count keeps the count; a USD quote leaves the country to the guardian', () => {
    const last = { ...WEEKLY, price_source: source({ count: 14, duration: 30, country: null, usdRate: 3.75, students: 1, discount: 0 }) };
    expect(renewalPricing(last)).toEqual({ pkg: 'custom', count: 14, duration: 30, discount: 0, country: '' });
  });

  it('weekly (90 min) keeps weekly, the duration falls back to the default', () => {
    expect(renewalPricing(WEEKLY)).toMatchObject({ pkg: 'weekly', duration: DEFAULT_RENEWAL_PRICING.duration, country: 'SA' });
  });

  it('an unusable quote (an imported row): a custom package of its lesson count, clamped', () => {
    const last = { ...WEEKLY, duration: 30 as const, lessons_total: 12, price_source: 'tier' as unknown as QuoteResponse };
    expect(renewalPricing(last)).toEqual({ pkg: 'custom', count: 12, duration: 30, discount: 0, country: '' });
    expect(renewalPricing({ ...last, lessons_total: 500 }).count).toBe(60);
  });
});
