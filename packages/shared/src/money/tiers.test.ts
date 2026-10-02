import { describe, expect, it } from 'vitest';
import { lessonsOf, PACKAGE_IDS } from '../pricing/catalog.js';
import { TIER_PACKAGE_SIZE } from './tiers.js';

describe('TIER_PACKAGE_SIZE (R-SUB-01: subscriptions.package from the catalog)', () => {
  it.each(PACKAGE_IDS)('%s: the size is the catalog lesson count', (tier) => {
    expect(Number(TIER_PACKAGE_SIZE[tier])).toBe(lessonsOf(tier));
  });
});
