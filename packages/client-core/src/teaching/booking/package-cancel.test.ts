import { describe, expect, it } from 'vitest';
import {
  packageCancelOffered,
  parsePackageCancelCheck,
  salesPackageCancelKey,
  salesPackageCancelPath,
} from './package-cancel.js';

describe('«إلغاء الباقة» of the assistant', () => {
  it('one route for the check and the cancel, and its key', () => {
    expect(salesPackageCancelPath('s/1')).toBe('/sales/packages/s%2F1/cancel');
    expect(salesPackageCancelKey('s1')).toEqual(['sales', 'package-cancel', 's1']);
  });

  it('shows only when nothing blocks the cancel; hidden while unknown', () => {
    expect(packageCancelOffered({ subscriptionId: 's1', block: null })).toBe(true);
    for (const block of ['has_lessons', 'has_payments', 'already_cancelled', 'has_commission'] as const) {
      expect(packageCancelOffered({ subscriptionId: 's1', block })).toBe(false);
    }
    expect(packageCancelOffered(undefined)).toBe(false);
  });

  it('parses the GET body; an unknown code is refused', () => {
    expect(parsePackageCancelCheck({ subscriptionId: 's1', block: 'has_lessons' }).block).toBe('has_lessons');
    expect(() => parsePackageCancelCheck({ subscriptionId: 's1', block: 'nope' })).toThrow();
  });
});
