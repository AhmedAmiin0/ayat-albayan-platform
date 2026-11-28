import { describe, expect, it } from 'vitest';
import { quote } from './quote';
import { DEFAULT_RENEWAL_PRICING, renewalPricing } from './renewal';
import { renewalPricingSchema } from './renewal-pricing.schemas';

const accepts = (v: unknown): boolean => renewalPricingSchema.safeParse(v).success;

describe('renewalPricingSchema', () => {
  it('accepts the defaults and what renewalPricing seeds from a last package', () => {
    expect(renewalPricingSchema.parse(DEFAULT_RENEWAL_PRICING)).toEqual(DEFAULT_RENEWAL_PRICING);
    const options = { count: 9, duration: 60, country: 'SA', students: 1, discount: 10 } as const;
    const price_source = { ...quote(options), fx: null };
    const seed = renewalPricing({ price_source, lessons_total: 9, duration: 60 });
    expect(renewalPricingSchema.parse(seed)).toEqual(seed);
  });

  it('refuses a tier, duration or country the calculator does not offer', () => {
    expect(accepts({ ...DEFAULT_RENEWAL_PRICING, pkg: 'gold' })).toBe(false);
    expect(accepts({ ...DEFAULT_RENEWAL_PRICING, duration: 50 })).toBe(false);
    expect(accepts({ ...DEFAULT_RENEWAL_PRICING, country: 'EG' })).toBe(false);
  });

  it('refuses a lesson count or a discount outside the calculator range', () => {
    expect(accepts({ ...DEFAULT_RENEWAL_PRICING, count: 0 })).toBe(false);
    expect(accepts({ ...DEFAULT_RENEWAL_PRICING, count: 61 })).toBe(false);
    expect(accepts({ ...DEFAULT_RENEWAL_PRICING, count: 2.5 })).toBe(false);
    expect(accepts({ ...DEFAULT_RENEWAL_PRICING, discount: -1 })).toBe(false);
    expect(accepts({ ...DEFAULT_RENEWAL_PRICING, discount: 101 })).toBe(false);
  });
});
