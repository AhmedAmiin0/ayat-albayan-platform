import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '@/common/audit/audit.service';
import type { PushService } from '@/common/push/push.service';
import type { PaymentsService } from '@/modules/finance/payments';
import { cardRow, REQ, row, SUB } from './stop-refund.fakes';
import { StopRefundLedger } from './stop-refund.ledger';
import { manualRefundKey, type RefundPlan } from './stop-refund.plan';

// The manual leg of «إلغاء مع استرداد»: one refund row per stop and the admins' bell.
const calc = { paid: 290, perLesson: 50, attended: 0, ratePercent: 100, charged: 0, refund: 290 };
const plan = (rows = [cardRow(), row({ method: 'cash' })]): RefundPlan => ({
  sub: SUB,
  pkg: { price: 400, lessonsTotal: 8, attended: 0, studentName: 'ط' },
  calc,
  cards: [
    { paymentId: 'p-card', intent: 'pi_1', refundable: 200, chargeRefundable: 200, mine: [] },
  ],
  rows,
  requestId: REQ,
  amount: 250,
});

function ledger() {
  const payments = { create: vi.fn() };
  const push = { notifyAdmins: vi.fn() };
  const audits = { record: vi.fn() };
  const l = new StopRefundLedger(
    payments as unknown as PaymentsService,
    push as unknown as PushService,
    audits as unknown as AuditService,
  );
  return { l, payments, push, audits };
}

describe('StopRefundLedger', () => {
  it('records the rest with the manual method, the stop key, the reason; then the bell', async () => {
    const { l, payments, push } = ledger();
    await l.manual({ plan: plan(), amount: 50, actor: { id: 'a1', reason: 'سفر' } });
    expect(payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 50,
        kind: 'refund',
        method: 'cash',
        clientRequestId: manualRefundKey(REQ),
      }),
      'a1',
    );
    expect(payments.create.mock.calls[0]?.[0].note).toContain('سفر');
    expect(push.notifyAdmins).toHaveBeenCalledWith(
      'payment_due',
      expect.objectContaining({
        subject: `course_stop_refund:${REQ}`,
        vars: { student: 'ط', left: '50 SAR' },
        data: { studentId: SUB.studentId },
      }),
    );
  });

  it('nothing manual: no row, no bell; only card payments → bank by default', async () => {
    const { l, payments, push } = ledger();
    await l.manual({ plan: plan(), amount: 0, actor: { id: 'a1', reason: 'سفر' } });
    expect(payments.create).not.toHaveBeenCalled();
    expect(push.notifyAdmins).not.toHaveBeenCalled();
    await l.manual({ plan: plan([cardRow()]), amount: 5, actor: { id: 'a1', reason: 'سفر' } });
    expect(payments.create.mock.calls[0]?.[0].method).toBe('bank');
  });

  it('audits the Stripe refunds the stop created', async () => {
    const { l, audits } = ledger();
    const result = { amount: 250, card: 200, manual: 50 };
    await l.audit({ plan: plan(), result, stripe: ['re_1'], actorId: 'a1' });
    expect(audits.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'subscriptions',
        entityId: SUB.id,
        action: 'stop_refund',
        after: { ...result, stripe_refunds: ['re_1'], client_request_id: REQ },
      }),
    );
  });
});
