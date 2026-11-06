import type { Permission } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import type { AuthUser } from '@/common/auth/verify-token';
import { gateKit } from './stop-refund.fakes';
import type { RefundPlan } from './stop-refund.plan';

// Review 2026-11-06: «إلغاء فقط» below the default (nothing, or custom under attended × rate = 150)
// forgives money, so it needs subscriptions.refund and the sales ownership rule, as a refund does.
const SUB = { id: 'sub1', studentId: 'hers', currency: 'SAR' };
const OTHER = { ...SUB, studentId: 'not-hers' };
const STOP: Permission[] = ['subscriptions.stop'];
const sales: AuthUser = { id: 's1', email: null, role: 'sales', permissions: STOP };
const refunder: AuthUser = { ...sales, permissions: [...STOP, 'subscriptions.refund'] };
const owe = (choice: 'attended' | 'price' | 'nothing' | 'custom', amount?: number) => ({
  sub: SUB,
  ask: amount === undefined ? { choice } : { choice, amount },
  stored: null,
});

describe('StopRefundGate.decide: owe choices below the default', () => {
  it.each([[owe('nothing')], [owe('custom', 149.99)], [owe('custom', 0)]])(
    'without subscriptions.refund %o: 403 refund_not_allowed, nothing chosen',
    async (input) => {
      const { g, owed } = gateKit(false);
      await expect(g.decide(sales, input)).rejects.toThrow('refund_not_allowed');
      expect(owed.choose).not.toHaveBeenCalled();
    },
  );

  it.each([[owe('attended')], [owe('price')], [owe('custom', 150)], [owe('custom', 400)]])(
    'at or above the default %o: any person who may stop',
    async (input) => {
      const { g } = gateKit(true);
      expect(await g.decide(sales, input)).toBe('decision');
    },
  );

  it('a refund holder: her own student yes, another one 403 not_your_student', async () => {
    const { g } = gateKit(true);
    expect(await g.decide(refunder, owe('nothing'))).toBe('decision');
    const other = { ...owe('nothing'), sub: OTHER };
    await expect(g.decide(refunder, other)).rejects.toThrow('not_your_student');
  });
});

describe('StopRefundGate.execute after the stop committed', () => {
  it('a refund that throws (Stripe error) rings the admins’ bell, then fails as before', async () => {
    const { g, refunds, ledger } = gateKit(false);
    refunds.execute.mockRejectedValue(new Error('stripe_down'));
    const plan = { sub: SUB } as unknown as RefundPlan;
    const input = { plan, actor: { id: 'a1', reason: 'سفر' } };
    await expect(g.execute(input)).rejects.toThrow('stripe_down');
    expect(ledger.failed).toHaveBeenCalledWith(plan);
  });

  it('a refund that finishes rings nothing extra', async () => {
    const { g, refunds, ledger } = gateKit(false);
    refunds.execute.mockResolvedValue({ amount: 1, card: 0, manual: 1 });
    await g.execute({
      plan: { sub: SUB } as unknown as RefundPlan,
      actor: { id: 'a1', reason: 'x' },
    });
    expect(ledger.failed).not.toHaveBeenCalled();
  });
});
