import { describe, expect, it } from 'vitest';
import { cancelBlock, cancelOffered, currentPackage, livePackages, subscriptionCancelSchema } from './package-cancel.js';

describe('cancelBlock («إلغاء الباقة», owner 2026-10-28)', () => {
  it('a package with nothing paid and no lesson may be cancelled', () => {
    expect(cancelBlock({ status: 'unpaid', paid: 0, lessons: 0 })).toBeNull();
    expect(cancelBlock({ status: 'active', paid: 0, lessons: 0 })).toBeNull();
  });
  it('already_cancelled wins, then has_payments, then has_lessons', () => {
    expect(cancelBlock({ status: 'cancelled', paid: 50, lessons: 3 })).toBe('already_cancelled');
    expect(cancelBlock({ status: 'unpaid', paid: 50, lessons: 3 })).toBe('has_payments');
    expect(cancelBlock({ status: 'unpaid', paid: 0, lessons: 1 })).toBe('has_lessons');
  });
  it('a net negative (refund over payment) still counts as money moved', () => {
    expect(cancelBlock({ status: 'unpaid', paid: -10, lessons: 0 })).toBe('has_payments');
  });
});

describe('live and current packages skip a cancelled one', () => {
  const rows = [
    { id: 'c', status: 'cancelled' as const },
    { id: 'b', status: 'unpaid' as const },
    { id: 'a', status: 'active' as const },
  ];
  it('livePackages drops cancelled', () => {
    expect(livePackages(rows).map((r) => r.id)).toEqual(['b', 'a']);
  });
  it('currentPackage: newest active, else newest live, never cancelled', () => {
    expect(currentPackage(rows)?.id).toBe('a');
    expect(currentPackage(rows.slice(0, 2))?.id).toBe('b');
    expect(currentPackage(rows.slice(0, 1))).toBeNull();
    expect(currentPackage([])).toBeNull();
  });
});

describe('subscriptionCancelSchema', () => {
  it('reason optional, trimmed, ≤ 500; nothing else accepted', () => {
    expect(subscriptionCancelSchema.parse({})).toEqual({});
    expect(subscriptionCancelSchema.parse({ reason: '  خطأ  ' })).toEqual({ reason: 'خطأ' });
    expect(subscriptionCancelSchema.safeParse({ reason: 'x'.repeat(501) }).success).toBe(false);
    expect(subscriptionCancelSchema.safeParse({ status: 'active' }).success).toBe(false);
  });
});

describe('cancelOffered (the row action)', () => {
  it('only a live package with nothing paid', () => {
    expect(cancelOffered({ status: 'unpaid', paid: 0 })).toBe(true);
    expect(cancelOffered({ status: 'unpaid', paid: 10 })).toBe(false);
    expect(cancelOffered({ status: 'cancelled', paid: 0 })).toBe(false);
  });
});
