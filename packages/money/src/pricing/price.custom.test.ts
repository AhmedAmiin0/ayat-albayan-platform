import { describe, expect, it } from 'vitest';
import { customBase, priceIn, starterRateBase } from './price.js';

// docs/08 §3: n lessons at starter's rate (base/8) below 28, bulk's (base/28) from 28 up.
// [n, SA price 30/45/60, KW price 30/45/60] — the site's lE output.
const CUSTOM: [number, number[], number[]][] = [
  [1, [12, 15, 20], [2, 2, 2]],
  [8, [90, 120, 160], [9, 12, 16]],
  [27, [304, 405, 540], [31, 41, 54]],
  [28, [275, 385, 495], [28, 39, 50]],
  [60, [590, 825, 1061], [59, 83, 107]],
];
const DURATIONS = [30, 45, 60] as const;

describe('custom lesson count (docs/08 §3)', () => {
  it.each(
    CUSTOM.flatMap(([n, sa, kw]) =>
      DURATIONS.flatMap((d, i) => [
        { n, d, country: 'SA', expected: sa[i] },
        { n, d, country: 'OM', expected: kw[i] },
      ]),
    ),
  )('$n lessons × $d min in $country = $expected', ({ n, d, country, expected }) => {
    expect(priceIn({ base: customBase(n, d), country })).toBe(expected);
  });

  it('28 custom lessons cost the same as the bulk package', () => {
    expect(DURATIONS.map((d) => customBase(28, d))).toEqual([275, 385, expect.closeTo(495)]);
  });

  it('starter-rate reference for 28 lessons («بدلاً من»): 315 / 420 / 560 SAR', () => {
    expect(DURATIONS.map((d) => priceIn({ base: starterRateBase(28, d), country: 'SA' }))).toEqual([
      315, 420, 560,
    ]);
  });
});
