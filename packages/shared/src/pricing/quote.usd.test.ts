import { describe, expect, it } from 'vitest';
import { SAR_PER_USD_PEG } from './currency.js';
import { quote, type QuoteOptions } from './quote.js';

// docs/08 §1: any non-site country → USD = ceil(SAR base × rate(SAR→USD)).
const base = { duration: 45, students: 1, discount: 0 } satisfies Partial<QuoteOptions>;
const PEG = 1 / SAR_PER_USD_PEG;

describe('quote in USD (docs/08 §1, §4)', () => {
  it.each([
    { tier: 'starter', duration: 45, usdRate: 0.25, price: 30 },
    { tier: 'bulk', duration: 45, usdRate: 0.25, price: 97 },
    { tier: 'weekly', duration: 45, usdRate: 0.25, price: 37 },
    { tier: 'starter', duration: 30, usdRate: PEG, price: 24 },
    { tier: 'starter', duration: 45, usdRate: PEG, price: 32 },
    { tier: 'starter', duration: 60, usdRate: PEG, price: 43 },
    // API rates carry 6 decimals; 120 × 0.266667 = 32.00004 is still $32 (cents first, then ceil).
    { tier: 'starter', duration: 45, usdRate: 0.266667, price: 32 },
    { tier: 'standard', duration: 45, usdRate: 0.266667, price: 48 },
    { tier: 'bulk', duration: 45, usdRate: 0.266667, price: 103 },
    { tier: 'weekly', duration: 45, usdRate: 0.266667, price: 39 },
  ] as const)('$tier $duration min at $usdRate = $$price', ({ tier, duration, usdRate, price }) => {
    const q = quote({ ...base, tier, duration, country: 'EG', usdRate });
    expect([q.currency, q.country, q.price]).toEqual(['USD', null, price]);
  });

  it('unknown and missing countries are USD too', () => {
    for (const country of [null, undefined, '', 'GB', 'Oman']) {
      expect(quote({ ...base, tier: 'starter', country, usdRate: 0.25 }).currency).toBe('USD');
    }
  });

  it('featured savings and custom counts convert the same way', () => {
    const bulk = quote({ ...base, tier: 'bulk', country: 'US', usdRate: 0.25 });
    expect([bulk.price, bulk.insteadOf, bulk.savingsPct]).toEqual([97, 105, 8]);
    const custom = quote({ ...base, count: 60, duration: 60, country: 'US', usdRate: 0.25 });
    expect(custom.price).toBe(266);
  });

  it('students and discount apply to the USD price', () => {
    const q = quote({
      ...base,
      tier: 'premium',
      country: 'EG',
      usdRate: 0.25,
      students: 2,
      discount: 15,
    });
    expect([q.price, q.total, q.afterDiscount]).toEqual([60, 120, 102]);
  });

  it('throws without a rate', () => {
    expect(() => quote({ ...base, tier: 'starter', country: 'EG' })).toThrow(/usdRate/);
  });
});
