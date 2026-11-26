import { DEFAULT_DURATION, PRICING_DURATIONS } from '@ab/money';
import { describe, expect, it } from 'vitest';
import { durationOf, PACKAGE_OPTIONS } from './package-steps.helpers';

describe('durationOf', () => {
  it('reads each offered duration back from its option value', () => {
    for (const d of PRICING_DURATIONS) expect(durationOf(String(d))).toBe(d);
  });

  it('falls back to the default duration for a value that is not offered', () => {
    expect(durationOf('7')).toBe(DEFAULT_DURATION);
    expect(durationOf('')).toBe(DEFAULT_DURATION);
  });
});

describe('PACKAGE_OPTIONS', () => {
  it('lists the packages from once a week up to every day, then the custom count', () => {
    expect(PACKAGE_OPTIONS.map((o) => o.value)).toEqual([
      'weekly',
      'starter',
      'standard',
      'premium',
      'monthly',
      'bulk',
      'custom',
    ]);
  });
});
