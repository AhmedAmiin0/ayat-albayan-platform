import { ROUNDING_MODES } from '@ab/money';
import { describe, expect, it } from 'vitest';
import { askedRounding, roundingShows } from './quote-rounding';

describe('askedRounding — the rounding a price request carries', () => {
  it.each(ROUNDING_MODES)('with a discount, «%s» is asked as chosen', (chosen) => {
    expect([7, 0.5, 100].map((discount) => askedRounding(discount, chosen))).toEqual([
      chosen,
      chosen,
      chosen,
    ]);
  });

  it.each(ROUNDING_MODES)('without a discount, «%s» is asked as nearest', (chosen) => {
    expect(askedRounding(0, chosen)).toBe('nearest');
  });
});

describe('roundingShows — whether the sheet offers the rounding choice', () => {
  it('is hidden without a discount, in both modes', () => {
    expect(roundingShows({ discount: 0, mode: 'one', customOn: false })).toBe(false);
    expect(roundingShows({ discount: 0, mode: 'all', customOn: false })).toBe(false);
  });

  it('shows with a discount, in both modes', () => {
    expect(roundingShows({ discount: 7, mode: 'one', customOn: false })).toBe(true);
    expect(roundingShows({ discount: 7, mode: 'all', customOn: false })).toBe(true);
  });

  it('a custom amount hides it on the single offer: the typed amount is the total', () => {
    expect(roundingShows({ discount: 7, mode: 'one', customOn: true })).toBe(false);
  });

  it('a custom amount left on does not hide it on the price list, which has none', () => {
    expect(roundingShows({ discount: 7, mode: 'all', customOn: true })).toBe(true);
  });
});
