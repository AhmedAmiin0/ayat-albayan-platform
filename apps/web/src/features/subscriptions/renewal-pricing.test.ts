import { quote, type QuoteResponse } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { WEEKLY } from './money-fixture';
import { INITIAL_PRICING } from './pricing-form';
import { renewalPricing } from './renewal-pricing';

const source = (o: Parameters<typeof quote>[0]): QuoteResponse => ({ ...quote(o), fx: null });

describe('renewalPricing («جدّد الاشتراك» from the last package)', () => {
  it('no last package: the calculator defaults', () => {
    expect(renewalPricing(null)).toEqual(INITIAL_PRICING);
    expect(renewalPricing(undefined)).toEqual(INITIAL_PRICING);
  });

  it('a tier keeps its tier, duration, discount and country', () => {
    const last = { ...WEEKLY, duration: 60 as const, price_source: source({ tier: 'premium', duration: 60, country: 'AE', students: 1, discount: 10 }) };
    expect(renewalPricing(last)).toEqual({ pkg: 'premium', count: INITIAL_PRICING.count, duration: 60, discount: 10, country: 'AE' });
  });

  it('a custom count keeps the count; a USD quote leaves the country to the guardian', () => {
    const last = { ...WEEKLY, price_source: source({ count: 14, duration: 30, country: null, usdRate: 3.75, students: 1, discount: 0 }) };
    expect(renewalPricing(last)).toEqual({ pkg: 'custom', count: 14, duration: 30, discount: 0, country: '' });
  });

  it('weekly (90 min) keeps weekly, the duration falls back to the default', () => {
    expect(renewalPricing(WEEKLY)).toMatchObject({ pkg: 'weekly', duration: INITIAL_PRICING.duration, country: 'SA' });
  });

  it('an unusable quote (an imported row): a custom package of its lesson count', () => {
    const last = { ...WEEKLY, duration: 30 as const, lessons_total: 12, price_source: 'tier' as unknown as QuoteResponse };
    expect(renewalPricing(last)).toEqual({ pkg: 'custom', count: 12, duration: 30, discount: 0, country: '' });
  });
});
