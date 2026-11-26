import { describe, expect, it } from 'vitest';
import { quote, type QuoteOptions } from '../quote';
import { roundPrice } from '../rounding';
import { DEFAULT_ROUNDING, ROUNDING_MODES, roundingSchema } from '../rounding.schemas';

const base = {
  duration: 45,
  country: 'SA',
  students: 1,
  discount: 0,
} satisfies Partial<QuoteOptions>;

const afterByMode = (o: QuoteOptions): number[] =>
  ROUNDING_MODES.map((rounding) => quote({ ...o, rounding }).afterDiscount);

describe('rounding modes (docs/08 §3)', () => {
  it('lists nearest, up and down, nearest being the default', () => {
    expect([...ROUNDING_MODES]).toEqual(['nearest', 'up', 'down']);
    expect(DEFAULT_ROUNDING).toBe('nearest');
  });

  it('the schema takes a mode and refuses anything else', () => {
    expect(roundingSchema.parse('down')).toBe('down');
    for (const bad of ['', 'Up', 'ceil', 1, null]) {
      expect(roundingSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe('roundPrice', () => {
  it.each([
    [261.25, [261, 262, 261]],
    [48.6, [49, 49, 48]],
    [157.5, [158, 158, 157]],
    [630, [630, 630, 630]],
    [0, [0, 0, 0]],
  ] as const)('%d → nearest, up, down = %j', (amount, want) => {
    expect(ROUNDING_MODES.map((mode) => roundPrice(amount, mode))).toEqual(want);
  });

  it('float noise above a whole unit never rounds up to the next one', () => {
    expect(90 * (1 - 70 / 100)).toBe(27.000000000000004);
    expect(roundPrice(27.000000000000004, 'up')).toBe(27);
    expect(roundPrice(261.00000000000006, 'up')).toBe(261);
    expect(roundPrice(99.00000000000001, 'up')).toBe(99);
  });

  it('float noise below a whole unit never rounds down to the one before', () => {
    expect(90 * (1 - 30 / 100)).toBe(62.99999999999999);
    expect(roundPrice(62.99999999999999, 'down')).toBe(63);
    expect(roundPrice(1007.9999999999999, 'down')).toBe(1008);
  });

  it('a real cent is not noise: it still moves the price', () => {
    expect(roundPrice(261.01, 'up')).toBe(262);
    expect(roundPrice(261.99, 'down')).toBe(261);
  });

  it('nearest is plain Math.round on the product, as before the option', () => {
    // 90 × 0.45 is 40.49999999999999: rounding to cents first would give 41.
    expect(90 * (1 - 55 / 100)).toBe(40.49999999999999);
    expect(roundPrice(40.49999999999999, 'nearest')).toBe(40);
    expect(roundPrice(40.49999999999999)).toBe(40);
  });
});

describe('quote — rounding the price after the discount', () => {
  it('bulk 30 min at 5 % is 261.25: 261 nearest, 262 up, 261 down', () => {
    expect(afterByMode({ ...base, tier: 'bulk', duration: 30, discount: 5 })).toEqual([
      261, 262, 261,
    ]);
  });

  it('a divisor country with students: KW standard × 3 at 10 % is 48.6', () => {
    const o = { ...base, tier: 'standard', country: 'KW', students: 3, discount: 10 } as const;
    expect(afterByMode(o)).toEqual([49, 49, 48]);
  });

  it('a fractional percent: standard at 12.5 % is 157.5', () => {
    expect(afterByMode({ ...base, tier: 'standard', discount: 12.5 })).toEqual([158, 158, 157]);
  });

  it('USD: starter at 0.25 with 5 % is 28.5', () => {
    const o = { ...base, tier: 'starter', country: 'EG', usdRate: 0.25, discount: 5 } as const;
    expect(afterByMode(o)).toEqual([29, 29, 28]);
  });

  it('float noise in the product moves neither up nor down', () => {
    const starter = { ...base, tier: 'starter', duration: 30 } as const;
    expect(afterByMode({ ...starter, discount: 70 })).toEqual([27, 27, 27]);
    expect(afterByMode({ ...starter, discount: 30 })).toEqual([63, 63, 63]);
    expect(afterByMode({ ...starter, students: 2, discount: 45 })).toEqual([99, 99, 99]);
  });

  it('with no discount every mode is the total', () => {
    const o = { ...base, tier: 'premium', country: 'OM', students: 4 } as const;
    expect(afterByMode(o)).toEqual([96, 96, 96]);
  });

  it('changes afterDiscount only', () => {
    const o = { ...base, tier: 'bulk', duration: 30, discount: 5 } as const;
    const { afterDiscount: _nearest, ...nearest } = quote(o);
    const { afterDiscount: _up, ...up } = quote({ ...o, rounding: 'up' });
    expect(up).toEqual(nearest);
  });
});
