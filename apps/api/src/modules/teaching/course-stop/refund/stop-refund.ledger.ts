import type { CourseStopRefunded } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { ar } from '@/common/infra/i18n/server-text';
import { PushService } from '@/common/push/push.service';
import { PaymentsService } from '@/modules/finance/payments';
import type { MoneyRow } from './stop-refund.repo';
import { manualRefundKey, type RefundPlan } from './stop-refund.plan';

const METHODS = ['bank', 'wallet', 'cash', 'other', 'card'] as const;
type Method = (typeof METHODS)[number];

/** A manual refund is never stamped 'card': only a Stripe refund is (its webhook writes it). */
const isManualMethod = (r: MoneyRow): boolean => r.method !== 'card';

/**
 * The method of the newest payment no payment link recorded and not stamped card (a card payment
 * recorded by hand is refunded by transfer); bank when there is none.
 */
function manualMethod(rows: readonly MoneyRow[], cardIds: ReadonlySet<string>): Method {
  const manual = rows.filter((r) => r.kind === 'payment' && !cardIds.has(r.id));
  return manual.filter(isManualMethod).at(-1)?.method ?? 'bank';
}

/**
 * The platform side of «إلغاء مع استرداد»: the manual refund row (kind 'refund', the family's own
 * method, idempotent on the stop's key) with the admins' bell «حوّل … للعائلة», and the audit
 * row of the Stripe refunds the stop created.
 */
@Injectable()
export class StopRefundLedger {
  constructor(
    private readonly payments: PaymentsService,
    private readonly push: PushService,
    private readonly audits: AuditService,
  ) {}

  async manual(input: {
    plan: RefundPlan;
    amount: number;
    actor: { id: string; reason: string };
  }): Promise<void> {
    const { plan, amount, actor } = input;
    if (amount <= 0) return;
    const cardIds = new Set(plan.cards.map((c) => c.paymentId));
    const words = ar.courseActions.stop;
    const write = {
      subscriptionId: plan.sub.id,
      amount,
      currency: plan.sub.currency,
      kind: 'refund' as const,
      method: manualMethod(plan.rows, cardIds),
      paidAt: new Date().toISOString(),
      note: words.refundNote.replace('{reason}', actor.reason),
      clientRequestId: manualRefundKey(plan.requestId),
    };
    // A replay answers the row the first call recorded: the bell names that row's amount.
    const row = await this.payments.create(write, actor.id);
    const left = `${row.amount} ${plan.sub.currency}`;
    await this.push.notifyAdmins('payment_due', {
      subject: `course_stop_refund:${plan.requestId}`,
      title: words.refundBell.replace('{amount}', left),
      vars: { student: plan.pkg.studentName, left },
      data: { studentId: plan.sub.studentId },
      bellOnly: true,
    });
  }

  /**
   * The stop committed but its refund did not finish (Stripe error, crash; review 2026-11-06):
   * the admins' bell «تعذّر إتمام استرداد …», so a half-done refund is seen and retried.
   */
  async failed(plan: RefundPlan): Promise<void> {
    const left = `${plan.amount} ${plan.sub.currency}`;
    await this.push.notifyAdmins('payment_due', {
      subject: `course_stop_refund_failed:${plan.requestId}`,
      title: ar.courseActions.stop.refundFailedBell.replace('{amount}', left),
      vars: { student: plan.pkg.studentName, left },
      data: { studentId: plan.sub.studentId },
      bellOnly: true,
    });
  }

  async audit(input: {
    plan: RefundPlan;
    result: CourseStopRefunded;
    stripe: string[];
    actorId: string;
  }): Promise<void> {
    await this.audits.record({
      actorId: input.actorId,
      entity: 'subscriptions',
      entityId: input.plan.sub.id,
      action: 'stop_refund',
      after: {
        ...input.result,
        stripe_refunds: input.stripe,
        client_request_id: input.plan.requestId,
      },
    });
  }
}
