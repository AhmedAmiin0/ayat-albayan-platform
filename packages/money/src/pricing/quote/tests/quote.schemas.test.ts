import { describe, expect, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';
import { quote, type FxRate, type Quote } from '../quote';
import { fxRateSchema, quoteSchema } from '../quote.schemas';

const sample = quote({ tier: 'bulk', duration: 45, country: 'KW', students: 2, discount: 10 });

describe('quoteSchema — a quote as it travels (GET /pricing/*)', () => {
  it('is exactly the Quote quote() builds', () => {
    expectTypeOf<z.infer<typeof quoteSchema>>().toEqualTypeOf<Quote>();
    expect(quoteSchema.parse(sample)).toEqual(sample);
  });

  it('takes a custom count and a USD quote', () => {
    const custom = quote({
      count: 20,
      duration: 30,
      country: 'EG',
      students: 1,
      discount: 0,
      usdRate: 0.25,
    });
    expect(quoteSchema.parse(custom)).toEqual(custom);
  });

  it.each([
    ['package', 'gold'],
    ['currency', 'EGP'],
    ['country', 'EG'],
    ['afterDiscount', '49'],
    ['insteadOf', undefined],
    ['featured', 'yes'],
  ])('refuses a bad %s', (key, value) => {
    expect(quoteSchema.safeParse({ ...sample, [key]: value }).success).toBe(false);
  });
});

describe('fxRateSchema', () => {
  const peg = {
    quote: 'USD',
    rate: 0.266667,
    date: null,
    provider: 'peg',
    fallback: true,
    ageHours: null,
  };

  it('is exactly the FxRate the API attaches', () => {
    expectTypeOf<z.infer<typeof fxRateSchema>>().toEqualTypeOf<FxRate>();
    expect(fxRateSchema.parse(peg)).toEqual(peg);
  });

  it('refuses a rate that is not a number', () => {
    expect(fxRateSchema.safeParse({ ...peg, rate: '0.25' }).success).toBe(false);
  });
});
