import { describe, expect, it } from 'vitest';
import { PRICING_DURATIONS } from '../../catalog';
import { quote } from '../../quote';
import { ROUNDING_MODES } from '../../quote/rounding.schemas';
import { priceList } from '../price-list';
import type { PriceListOptions } from '../price-list.types';

const base = { country: 'SA', students: 1, discount: 0 } satisfies PriceListOptions;
const PER_DURATION = ['starter', 'standard', 'premium', 'bulk', 'monthly'] as const;

const after = (o: PriceListOptions): number[][] =>
  priceList(o).groups.map((g) => g.packages.map((q) => q.afterDiscount));

describe('priceList — the whole list of one country (docs/08 §3b)', () => {
  it('SA: 30, 45 and 60 minutes, five packages each in site order, then weekly once', () => {
    const list = priceList(base);
    expect(list).toMatchObject({ country: 'SA', currency: 'SAR', students: 1, discount: 0 });
    expect(list.groups.map((g) => g.duration)).toEqual([...PRICING_DURATIONS]);
    for (const group of list.groups) {
      expect(group.packages.map((q) => q.package)).toEqual([...PER_DURATION]);
      expect(group.packages.map((q) => q.duration)).toEqual(Array(5).fill(group.duration));
    }
    expect(after(base)).toEqual([
      [90, 135, 175, 275, 210],
      [120, 180, 240, 385, 285],
      [160, 235, 315, 495, 375],
    ]);
  });

  it('weekly is priced once, at its fixed 90 minutes, and sits in no duration group', () => {
    const list = priceList(base);
    expect(list.weekly).toMatchObject({ package: 'weekly', lessons: 4, duration: 90, price: 145 });
    const grouped = list.groups.flatMap((g) => g.packages.map((q) => q.package));
    expect(grouped).not.toContain('weekly');
    expect(grouped).toHaveLength(15);
  });

  it('KW divides by 10 and keeps its currency on every price', () => {
    const list = priceList({ ...base, country: 'kw' });
    expect([list.country, list.currency]).toEqual(['KW', 'KWD']);
    expect(after({ ...base, country: 'kw' })[1]).toEqual([12, 18, 24, 39, 29]);
    expect(list.weekly.afterDiscount).toBe(15);
    expect(new Set(list.groups.flatMap((g) => g.packages.map((q) => q.currency)))).toEqual(
      new Set(['KWD']),
    );
  });

  it('another country is USD through the given rate', () => {
    const list = priceList({ ...base, country: 'EG', usdRate: 0.25 });
    expect([list.country, list.currency]).toEqual([null, 'USD']);
    expect(after({ ...base, country: 'EG', usdRate: 0.25 })[1]).toEqual([30, 45, 60, 97, 72]);
    expect(list.weekly.afterDiscount).toBe(37);
  });

  it('no country at all is USD too, and needs the rate', () => {
    expect(priceList({ ...base, country: null, usdRate: 0.25 }).currency).toBe('USD');
    expect(priceList({ students: 1, discount: 0, usdRate: 0.25 }).currency).toBe('USD');
    expect(() => priceList({ ...base, country: 'EG' })).toThrow(/usdRate/);
  });

  it('students multiply and the discount applies, on every price', () => {
    const o = { ...base, students: 2, discount: 10 };
    const list = priceList(o);
    expect([list.students, list.discount]).toEqual([2, 10]);
    expect(after(o)).toEqual([
      [162, 243, 315, 495, 378],
      [216, 324, 432, 693, 513],
      [288, 423, 567, 891, 675],
    ]);
    expect(list.weekly.afterDiscount).toBe(261);
  });

  it('keeps a fractional percent as chosen', () => {
    const list = priceList({ ...base, discount: 12.5 });
    expect(list.discount).toBe(12.5);
    expect(after({ ...base, discount: 12.5 })[1]).toEqual([105, 158, 210, 337, 249]);
  });
});

describe('priceList — rounding', () => {
  // 5 % of SA at 30 minutes: 85.5, 128.25, 166.25, 261.25, 199.5; weekly 137.75.
  const o = { ...base, discount: 5 };

  it.each([
    ['nearest', [86, 128, 166, 261, 200], 138],
    ['up', [86, 129, 167, 262, 200], 138],
    ['down', [85, 128, 166, 261, 199], 137],
  ] as const)('%s', (rounding, thirty, weekly) => {
    const list = priceList({ ...o, rounding });
    expect(list.groups[0]?.packages.map((q) => q.afterDiscount)).toEqual(thirty);
    expect(list.weekly.afterDiscount).toBe(weekly);
  });

  it('no rounding given is nearest', () => {
    expect(priceList(o)).toEqual(priceList({ ...o, rounding: 'nearest' }));
  });

  it('with no discount every mode gives the same list', () => {
    const lists = ROUNDING_MODES.map((rounding) => priceList({ ...base, rounding }));
    expect(lists[1]).toEqual(lists[0]);
    expect(lists[2]).toEqual(lists[0]);
  });
});

describe('priceList — a list price is the single quote for the same choice', () => {
  const PLACES = [{ country: 'SA' }, { country: 'OM' }, { country: 'EG', usdRate: 0.266667 }];
  const PICKS = [
    { students: 1, discount: 0 },
    { students: 3, discount: 15 },
    { students: 6, discount: 33.3 },
  ];
  const choices = ROUNDING_MODES.flatMap((rounding) =>
    PLACES.flatMap((place) => PICKS.map((pick) => ({ ...place, ...pick, rounding }))),
  );

  it.each(choices)('$country, $students at $discount %, rounding $rounding', (o) => {
    const list = priceList(o);
    for (const { duration, packages } of list.groups) {
      expect(packages).toEqual(PER_DURATION.map((tier) => quote({ ...o, tier, duration })));
    }
    expect(list.weekly).toEqual(quote({ ...o, tier: 'weekly', duration: 45 }));
  });

  it('covers every rounding mode, place and pick', () => {
    expect(choices).toHaveLength(27);
  });
});
