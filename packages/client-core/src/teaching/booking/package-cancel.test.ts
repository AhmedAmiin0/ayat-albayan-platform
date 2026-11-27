import { describe, expect, it } from 'vitest';
import { packageCancelOffered, salesPackageCancelKey } from './package-cancel';

describe('«إلغاء الباقة» of the assistant', () => {
  it('the check\'s query key', () => {
    expect(salesPackageCancelKey('s1')).toEqual(['sales', 'package-cancel', 's1']);
  });

  it('shows only when nothing blocks the cancel; hidden while unknown', () => {
    expect(packageCancelOffered({ subscriptionId: 's1', block: null })).toBe(true);
    for (const block of [
      'has_lessons',
      'has_payments',
      'already_cancelled',
      'has_commission',
    ] as const) {
      expect(packageCancelOffered({ subscriptionId: 's1', block })).toBe(false);
    }
    expect(packageCancelOffered(undefined)).toBe(false);
  });
});
