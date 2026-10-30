import { describe, expect, it } from 'vitest';
import { roundCents } from './price.js';
import { quote, type QuoteOptions } from './quote.js';

// «سعر الحلقة» is rounded the way the site's Intl formatter shows it. These 40 cases (all students
// 1–6) are where Math.round(x × 100) / 100 differed from ayatalbayan.com/calculator by 0.01.
type Case = [country: string, plan: string, duration: 30 | 45 | 60, discount: number, site: number];
const KW_45_15 = ['starter', 'standard', 'premium', ...[2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 26].map((n) => `c${n}`)];
const CASES: Case[] = [
  ...['SA', 'AE', 'QA'].flatMap((c): Case[] => [
    [c, 'c40', 30, 0, 9.83],
    [c, 'c2', 30, 5, 10.92],
  ]),
  ...['KW', 'OM'].flatMap((c): Case[] => [
    [c, 'c20', 30, 10, 1.04],
    [c, 'c2', 30, 15, 1.28],
    ...KW_45_15.map((plan): Case => [c, plan, 45, 15, 1.28]),
  ]),
];

function optionsOf([country, plan, duration, discount]: Case): QuoteOptions {
  const common = { country, duration, discount, students: 1 };
  if (plan.startsWith('c')) return { ...common, count: Number(plan.slice(1)) };
  if (plan === 'starter' || plan === 'standard' || plan === 'premium') return { ...common, tier: plan };
  throw new Error(`unexpected plan ${plan}`);
}

describe('quote — per lesson rounded like the site (docs/08 §3)', () => {
  it('covers the 40 former mismatches', () => expect(CASES).toHaveLength(40));

  it.each(CASES)('%s %s %i min %i%% → %d', (...c) => {
    for (const students of [1, 2, 3, 4, 5, 6]) {
      expect(quote({ ...optionsOf(c), students }).perLesson).toBe(c[4]);
    }
  });
});

describe('roundCents', () => {
  it.each([
    [9.825, 9.83],
    [10.924999999999999, 10.92],
    [1.275, 1.28],
    [9.995, 10],
    [13.5, 13.5],
    [36.25, 36.25],
    [0, 0],
    [1e-9, 0],
  ])('%d → %d', (x, want) => expect(roundCents(x)).toBe(want));
});
