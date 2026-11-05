import type { CourseStopRefunded, StopRefund } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { can } from '@/common/auth/permissions';
import type { AuthUser } from '@/common/auth/verify-token';
import { forbidden } from '@/common/http/errors';
import { SalesOwnershipRule } from '@/modules/sales/sales';
import type { RefundPlan, RefundSub } from './stop-refund.plan';
import { StopRefunds } from './stop-refund.service';

/** Who the assistant ownership rule binds: the sales base role; the admin never (#612). */
const isAssistant = (user: AuthUser): boolean => user.role === 'sales';

/** The refund leg of one stop: the package, its key, the amount asked. */
interface RefundAsk {
  sub: RefundSub;
  requestId: string;
  amount: number;
}

/**
 * Who may «إلغاء مع استرداد» (owner 2026-11-02 / 2026-11-05): a holder of subscriptions.refund
 * (403 refund_not_allowed); an assistant (base role sales) only on her own student while
 * SalesOwnershipRule enforces it (403 not_your_student), as «إلغاء الباقة» (#612). The sheet shows
 * refund lines only to whom the stop would let refund.
 */
@Injectable()
export class StopRefundGate {
  constructor(
    private readonly refunds: StopRefunds,
    private readonly rule: SalesOwnershipRule,
  ) {}

  /**
   * The sheet's refund lines, null for whom may not refund this student. Null too when they cannot
   * be read (Stripe unconfigured or down for a card payment): «إلغاء فقط» never waits on Stripe,
   * and the stop's own plan answers the 503.
   */
  async preview(user: AuthUser, sub: RefundSub): Promise<StopRefund | null> {
    const allowed = can(user, 'subscriptions.refund') && (await this.owns(user, sub.studentId));
    return allowed ? this.refunds.preview(sub).catch(() => null) : null;
  }

  /** Checked BEFORE the stop: nothing is stopped when it refuses. */
  async plan(actor: AuthUser, ask: RefundAsk): Promise<RefundPlan> {
    if (!can(actor, 'subscriptions.refund')) throw forbidden('refund_not_allowed');
    if (!(await this.owns(actor, ask.sub.studentId))) throw forbidden('not_your_student');
    return this.refunds.plan(ask);
  }

  execute(input: Parameters<StopRefunds['execute']>[0]): Promise<CourseStopRefunded> {
    return this.refunds.execute(input);
  }

  /** Every student while the rule is off or for a non-assistant; else only hers. */
  private async owns(user: AuthUser, studentId: string): Promise<boolean> {
    const own = isAssistant(user) ? await this.rule.scope(user) : null;
    return own === null || own.studentIds.includes(studentId);
  }
}
