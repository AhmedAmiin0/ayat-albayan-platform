import { describe, expect, it } from 'vitest';
import { lessonsOf, PACKAGE_IDS } from '../../pricing/catalog.js';
import { packagePerWeek, TIER_PACKAGE_SIZE } from './tiers.js';

describe('TIER_PACKAGE_SIZE (R-SUB-01: subscriptions.package from the catalog)', () => {
  it.each(PACKAGE_IDS)('%s: the size is the catalog lesson count', (tier) => {
    expect(Number(TIER_PACKAGE_SIZE[tier])).toBe(lessonsOf(tier));
  });
});

describe('packagePerWeek: the weekly days a monthly package means', () => {
  it.each([
    ['4', 1],
    ['8', 2],
    ['12', 3],
    ['16', 4],
    ['20', 5],
    ['28', 7],
  ] as const)('%s lessons a month → %i a week', (size, n) => {
    expect(packagePerWeek(size)).toBe(n);
  });
  it('a trial has no weekly rhythm', () => expect(packagePerWeek('trial')).toBeNull());
});
