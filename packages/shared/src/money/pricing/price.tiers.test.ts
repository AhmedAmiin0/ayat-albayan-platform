import { describe, expect, it } from 'vitest';
import { basePrice, PACKAGE_IDS, PRICING_DURATIONS, type PackageId } from './catalog.js';
import { priceIn } from './price.js';

// docs/08 §1–2: every price ayatalbayan.com/calculator shows, per package × duration × country.
// [package, SA/AE/QA price for 30/45/60, KW/OM price for 30/45/60 = ceil(base / 10)]
const SITE: [PackageId, number[], number[]][] = [
  ['starter', [90, 120, 160], [9, 12, 16]],
  ['standard', [135, 180, 235], [14, 18, 24]],
  ['premium', [175, 240, 315], [18, 24, 32]],
  ['bulk', [275, 385, 495], [28, 39, 50]],
  ['weekly', [145, 145, 145], [15, 15, 15]],
  ['monthly', [210, 285, 375], [21, 29, 38]],
];
const ROWS = SITE.flatMap(([id, base, tenth]) =>
  PRICING_DURATIONS.flatMap((d, i) => [
    ...['SA', 'AE', 'QA'].map((country) => ({ id, d, country, expected: base[i] })),
    ...['KW', 'OM'].map((country) => ({ id, d, country, expected: tenth[i] })),
  ]),
);

describe('site package prices (docs/08 §2)', () => {
  it('covers all 6 packages × 3 durations × 5 countries', () => {
    expect(SITE.map(([id]) => id)).toEqual([...PACKAGE_IDS]);
    expect(ROWS).toHaveLength(90);
  });

  it.each(ROWS)('$id $d min in $country = $expected', ({ id, d, country, expected }) => {
    expect(priceIn({ base: basePrice(id, d), country })).toBe(expected);
  });

  it('weekly is 145 SAR whatever duration is asked', () => {
    expect(PRICING_DURATIONS.map((d) => basePrice('weekly', d))).toEqual([145, 145, 145]);
  });

  it('country codes are matched case-insensitively', () => {
    expect(priceIn({ base: 385, country: ' kw ' })).toBe(39);
  });

  it('a USD country without a rate is a programming error', () => {
    expect(() => priceIn({ base: 120, country: 'EG' })).toThrow(/usdRate/);
    expect(() => priceIn({ base: 120, country: null, usdRate: 0 })).toThrow(/usdRate/);
  });
});
