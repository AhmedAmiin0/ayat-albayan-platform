import type { Permission } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '@/common/auth/verify-token';
import type { SalesOwnershipRule } from '@/modules/sales/sales';
import { StopRefundGate } from './stop-refund.gate';
import type { StopOwedCalc } from './stop-owed';
import type { StopRefunds } from './stop-refund.service';

// Review 2026-11-05: «إلغاء مع استرداد» follows SalesOwnershipRule like «إلغاء الباقة» (#612).
const SUB = { id: 'sub1', studentId: 'hers', currency: 'SAR' };
const OTHER = { ...SUB, studentId: 'not-hers' };
const REFUND: Permission[] = ['subscriptions.stop', 'subscriptions.refund'];
const sales: AuthUser = { id: 's1', email: null, role: 'sales', permissions: REFUND };
const admin: AuthUser = { id: 'a1', email: null, role: 'admin', permissions: REFUND };

function gate(enforced: boolean) {
  const refunds = {
    preview: vi.fn().mockResolvedValue({ refund: 10 }),
    plan: vi.fn().mockResolvedValue('plan'),
  };
  const own = enforced ? { studentIds: ['hers'] } : null;
  const rule = { scope: vi.fn().mockResolvedValue(own) };
  const ownership = rule as unknown as SalesOwnershipRule;
  const owed = {} as unknown as StopOwedCalc;
  const g = new StopRefundGate(refunds as unknown as StopRefunds, ownership, owed);
  return { g, refunds, rule };
}
const ask = (sub: typeof SUB) => ({
  sub,
  requestId: 'r1',
  ask: { choice: 'custom' as const, amount: 5 },
});
const LINES = { refund: { refund: 10 }, unavailable: false };
const NONE = { refund: null, unavailable: false };

describe('StopRefundGate: the rule enforcing', () => {
  it('her own student: planned and previewed', async () => {
    const { g } = gate(true);
    expect(await g.plan(sales, ask(SUB))).toBe('plan');
    expect(await g.preview(sales, SUB)).toEqual(LINES);
  });

  it('another student: 403 not_your_student before any plan; no refund lines', async () => {
    const { g, refunds } = gate(true);
    await expect(g.plan(sales, ask(OTHER))).rejects.toMatchObject({ status: 403 });
    await expect(g.plan(sales, ask(OTHER))).rejects.toThrow('not_your_student');
    expect(await g.preview(sales, OTHER)).toEqual(NONE);
    expect(refunds.plan).not.toHaveBeenCalled();
  });

  it('the admin is never bound by it', async () => {
    const { g, rule } = gate(true);
    expect(await g.plan(admin, ask(OTHER))).toBe('plan');
    expect(rule.scope).not.toHaveBeenCalled();
  });
});

describe('StopRefundGate: the rule off', () => {
  it('any student', async () => {
    const { g } = gate(false);
    expect(await g.plan(sales, ask(OTHER))).toBe('plan');
    expect(await g.preview(sales, OTHER)).toEqual(LINES);
  });

  it('Stripe unreadable: no refund lines, the sheet opens and says why (never silent)', async () => {
    const { g, refunds } = gate(false);
    refunds.preview.mockRejectedValue(new Error('stripe_not_configured'));
    expect(await g.preview(admin, SUB)).toEqual({ refund: null, unavailable: true });
  });

  it('without subscriptions.refund: 403 refund_not_allowed, no lines', async () => {
    const { g } = gate(false);
    const plain = { ...sales, permissions: ['subscriptions.stop'] as Permission[] };
    await expect(g.plan(plain, ask(SUB))).rejects.toThrow('refund_not_allowed');
    expect(await g.preview(plain, SUB)).toEqual(NONE);
  });
});
