import { describe, expect, it } from 'vitest';
import { paidVia, toMyCommission, type MyCommissionSource } from './my.commissions.mapper';

/** Staging, 2026-10-29: AB-1022's card payment earned 50 EGP at 16:42:13; the card refund at 16:48:05 voided it. */
const STAGING: MyCommissionSource = {
  id: 'ca03d8c8', kind: 'first', share_percent: 100, amount: 50, currency: 'EGP', earned_at: '2026-10-29T16:42:13+00:00',
  status: 'voided', void_reason: 'payment_voided', student: { code: 'AB-1022', name: 'lmkl' }, statement: null,
  subscription: {
    payments: [
      { method: 'card', kind: 'payment', paid_at: '2026-10-29T16:42:13+00:00' },
      { method: 'card', kind: 'refund', paid_at: '2026-10-29T16:48:05+00:00' },
    ],
  },
};
const earned = (over: Partial<MyCommissionSource> = {}): MyCommissionSource => ({ ...STAGING, status: 'earned', void_reason: null, ...over });

describe('toMyCommission («عمولاتي»)', () => {
  it('the staging row: voided by the refund, paid by card, the system reason as its code', () => {
    expect(toMyCommission(STAGING)).toEqual({
      id: 'ca03d8c8', student: { code: 'AB-1022', name: 'lmkl' }, kind: 'first', share_percent: 100, amount: 50, currency: 'EGP',
      earned_at: '2026-10-29T16:42:13+00:00', method: 'card', state: 'voided', statement_month: null, void_reason: 'payment_voided',
    });
  });

  it('a reason an admin typed never leaves (migration 271 hides it from sales): null, the app says «ألغتها الإدارة»', () => {
    expect(toMyCommission({ ...STAGING, void_reason: 'خطأ في الإسناد' }).void_reason).toBeNull();
    expect(toMyCommission({ ...STAGING, void_reason: 'student_merged' }).void_reason).toBe('student_merged');
  });

  it('the statement month only once it is approved or paid; a draft or none reads as owed', () => {
    expect(toMyCommission(earned({ statement: { status: 'approved', month: '2026-10-01' } }))).toMatchObject({ state: 'in_statement', statement_month: '2026-10-01' });
    expect(toMyCommission(earned({ statement: { status: 'paid', month: '2026-10-01' } }))).toMatchObject({ state: 'paid', statement_month: '2026-10-01' });
    expect(toMyCommission(earned({ statement: { status: 'draft', month: '2026-10-01' } }))).toMatchObject({ state: 'due', statement_month: null });
    expect(toMyCommission(earned())).toMatchObject({ state: 'due', statement_month: null, void_reason: null });
  });

  it('a renewal keeps its share; numbers come out as numbers', () => {
    const r = toMyCommission(earned({ kind: 'renewal', share_percent: '50' as unknown as number, amount: '25.5' as unknown as number }));
    expect(r).toMatchObject({ kind: 'renewal', share_percent: 50, amount: 25.5 });
  });

  it('a whitelist: no price, base amount, subscription or actor', () => {
    const r = toMyCommission({ ...earned(), base_amount: 180, subscription_id: 's1', recorded_by: 'x' } as MyCommissionSource);
    expect(Object.keys(r)).toEqual(['id', 'student', 'kind', 'share_percent', 'amount', 'currency', 'earned_at', 'method', 'state', 'statement_month', 'void_reason']);
  });
});

describe('paidVia: the payment that completed the package', () => {
  const at = '2026-10-29T16:42:13Z';

  it('the latest payment at or before earned_at; refunds and later payments are ignored', () => {
    const payments = [
      { method: 'bank' as const, kind: 'payment' as const, paid_at: '2026-10-20T10:00:00Z' },
      { method: 'card' as const, kind: 'payment' as const, paid_at: '2026-10-29T16:42:13.000+00:00' },
      { method: 'cash' as const, kind: 'refund' as const, paid_at: '2026-10-29T16:40:00Z' },
      { method: 'wallet' as const, kind: 'payment' as const, paid_at: '2026-10-30T09:00:00Z' },
    ];
    expect(paidVia(at, payments)).toBe('card');
  });

  it('no subscription any more, or no payment: null', () => {
    expect(toMyCommission({ ...STAGING, subscription: null }).method).toBeNull();
    expect(paidVia(at, [])).toBeNull();
  });
});
