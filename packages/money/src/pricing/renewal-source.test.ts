import { describe, expect, it } from 'vitest';
import { renewalPricing, type LastPackage } from './renewal';

const last = (priceSource: unknown): LastPackage => ({
  duration: 30,
  lessons_total: 12,
  price_source: priceSource as LastPackage['price_source'],
});
const CUSTOM_12 = { pkg: 'custom', count: 12, duration: 30, discount: 0, country: '' };

describe('renewalPricing reads only well-typed quote fields', () => {
  it('an array, null or number quote counts as no quote', () => {
    expect(renewalPricing(last(['package']))).toEqual(CUSTOM_12);
    expect(renewalPricing(last(null))).toEqual(CUSTOM_12);
    expect(renewalPricing(last(7))).toEqual(CUSTOM_12);
  });

  it('each bad field falls back alone and keeps the good ones', () => {
    const odd = { package: 'gold', duration: 37, lessons: '20', discount: 101, country: 'ZZ' };
    expect(renewalPricing(last(odd))).toEqual(CUSTOM_12);
    expect(renewalPricing(last({ ...odd, discount: 15, lessons: 20 }))).toEqual({
      ...CUSTOM_12,
      count: 20,
      discount: 15,
    });
  });

  it('a lesson count of zero or below keeps the package size; a negative discount is 0', () => {
    expect(renewalPricing(last({ lessons: 0, discount: -5 }))).toEqual(CUSTOM_12);
    expect(renewalPricing(last({ lessons: Number.NaN, discount: Number.NaN }))).toEqual(CUSTOM_12);
  });
});
