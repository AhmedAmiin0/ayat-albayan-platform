import { describe, expect, it } from 'vitest';
import { PACKAGE_IDS, PRICING_DURATIONS } from '../../catalog';
import { quote, type QuoteOptions } from '../quote';

// Subscriptions and payment links price a package through quote() without the option, so the
// default must stay the calculator's round(total × (1 − discount%)) for every choice.
const PLACES = [
  { country: 'SA' },
  { country: 'KW' },
  { country: 'EG', usdRate: 0.266667 },
] as const;
const STUDENTS = [1, 2, 3, 6];
const DISCOUNTS = [0, 5, 10, 15, 12.5, 30, 33.3, 55, 70, 89.505, 100];

function choices(): QuoteOptions[] {
  return PACKAGE_IDS.flatMap((tier) =>
    PRICING_DURATIONS.flatMap((duration) =>
      PLACES.flatMap((place) =>
        STUDENTS.flatMap((students) =>
          DISCOUNTS.map((discount) => ({ ...place, tier, duration, students, discount })),
        ),
      ),
    ),
  );
}

describe('quote — the default rounding is unchanged', () => {
  it('no option is round(total × (1 − discount%)), and so is nearest', () => {
    const all = choices();
    expect(all).toHaveLength(6 * 3 * 3 * 4 * 11);
    for (const o of all) {
      const q = quote(o);
      const before = Math.round(q.total * (1 - o.discount / 100));
      expect([o, q.afterDiscount]).toEqual([o, before]);
      expect(quote({ ...o, rounding: 'nearest' })).toEqual(q);
      expect(quote({ ...o, rounding: undefined })).toEqual(q);
    }
  });

  it('keeps the half-unit results the calculator already gives', () => {
    // 90 × 0.45 is 40.49999999999999 in floating point: 40 today, and it stays 40.
    const q = quote({ tier: 'starter', duration: 30, country: 'SA', students: 1, discount: 55 });
    expect(q.afterDiscount).toBe(40);
  });
});
