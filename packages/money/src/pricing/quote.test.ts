import { describe, expect, it } from 'vitest';
import { quote, type QuoteOptions } from './quote.js';

const base = {
  duration: 45,
  country: 'SA',
  students: 1,
  discount: 0,
} satisfies Partial<QuoteOptions>;

describe('quote — students, discount, per lesson (docs/08 §3)', () => {
  it('standard 45 min, 3 students, 10 %', () => {
    expect(quote({ ...base, tier: 'standard', students: 3, discount: 10 })).toEqual({
      package: 'standard',
      lessons: 12,
      duration: 45,
      country: 'SA',
      currency: 'SAR',
      price: 180,
      students: 3,
      total: 540,
      discount: 10,
      afterDiscount: 486,
      perLesson: 13.5,
      insteadOf: null,
      savingsPct: null,
      popular: true,
      featured: false,
    });
  });

  it.each([
    [0, 540, 15],
    [5, 513, 14.25],
    [10, 486, 13.5],
    [15, 459, 12.75],
  ] as const)('discount %i%% → after %i, per lesson %d', (discount, after, perLesson) => {
    const q = quote({ ...base, tier: 'standard', students: 3, discount });
    expect([q.afterDiscount, q.perLesson]).toEqual([after, perLesson]);
  });

  it('rounds after-discount to a whole unit and per lesson to 2 decimals', () => {
    const q = quote({ ...base, tier: 'starter', duration: 30, country: 'KW', discount: 15 });
    expect([q.price, q.afterDiscount, q.perLesson, q.currency]).toEqual([9, 8, 0.96, 'KWD']);
    const bulk = quote({ ...base, tier: 'bulk', duration: 30, discount: 5 });
    expect([bulk.afterDiscount, bulk.perLesson]).toEqual([261, 9.33]);
  });

  it('weekly is always 4 lessons of 90 minutes', () => {
    const q = quote({ ...base, tier: 'weekly', duration: 30, country: 'QA' });
    expect(q).toMatchObject({
      lessons: 4,
      duration: 90,
      price: 145,
      currency: 'QAR',
      perLesson: 36.25,
    });
  });

  it('a custom count is package "custom" with the site rate', () => {
    const q = quote({ ...base, count: 60, duration: 60, country: 'AE', students: 2 });
    expect(q).toMatchObject({
      package: 'custom',
      lessons: 60,
      price: 1061,
      total: 2122,
      currency: 'AED',
    });
    expect([q.insteadOf, q.savingsPct, q.featured]).toEqual([null, null, false]);
  });
});

describe('quote — featured savings badge (docs/08 §3)', () => {
  it.each([
    { country: 'SA', duration: 30, want: [275, 315, 13] },
    { country: 'SA', duration: 45, want: [385, 420, 8] },
    { country: 'SA', duration: 60, want: [495, 560, 12] },
    { country: 'KW', duration: 30, want: [28, 32, 13] },
    { country: 'OM', duration: 45, want: [39, 42, 7] },
    { country: 'KW', duration: 60, want: [50, 56, 11] },
  ] as const)(
    'bulk in $country at $duration min: [price, instead of, save %] = $want',
    ({ country, duration, want }) => {
      const q = quote({ ...base, tier: 'bulk', country, duration });
      expect([q.price, q.insteadOf, q.savingsPct, q.featured]).toEqual([...want, true]);
    },
  );
});
