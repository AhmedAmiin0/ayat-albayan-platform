import type { CourseStopRefunded, StopOwe, StopOweAsk, StopRefund } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { can } from '@/common/auth/permissions';
import type { AuthUser } from '@/common/auth/verify-token';
import { forbidden } from '@/common/http/errors';
import { SalesOwnershipRule } from '@/modules/sales/sales';
import { StopOwedCalc } from './stop-owed';
import type { OwedDecision, RefundPlan, RefundSub } from './stop-refund.plan';
import { StopRefunds, type RefundChoiceAsk } from './stop-refund.service';

/** Who the assistant ownership rule binds: the sales base role; the admin never (#612). */
const isAssistant = (user: AuthUser): boolean => user.role === 'sales';

/** The refund leg of one stop: the package, its key, the choice. */
interface RefundAsk {
  sub: RefundSub;
  requestId: string;
  ask: RefundChoiceAsk;
}

/** The sheet's refund lines; `unavailable` when the person may refund but they cannot be read. */
interface RefundPreview {
  refund: StopRefund | null;
  unavailable: boolean;
}

const NONE: RefundPreview = { refund: null, unavailable: false };

/**
 * Who may «إلغاء مع استرداد» (owner 2026-11-02 / 2026-11-05): a holder of subscriptions.refund
 * (403 refund_not_allowed); an assistant (base role sales) only on her own student while
 * SalesOwnershipRule enforces it (403 not_your_student), as «إلغاء الباقة» (#612). The sheet shows
 * refund lines only to whom the stop would let refund.
 */
@Injectable()
export class StopRefundGate {
  private readonly log = new Logger(StopRefundGate.name);

  constructor(
    private readonly refunds: StopRefunds,
    private readonly rule: SalesOwnershipRule,
    private readonly owed: StopOwedCalc,
  ) {}

  /** «إلغاء فقط»'s numbers (attended × rate, the price): no refund key needed. */
  owe(sub: RefundSub): Promise<StopOwe> {
    return this.owed.owe(sub);
  }

  /** What a plain stop leaves owed (409 owed_exceeds_price for a custom amount above the price). */
  decide(sub: RefundSub, ask: StopOweAsk | undefined): Promise<OwedDecision> {
    return this.owed.decide(sub, ask);
  }

  /**
   * The sheet's refund lines, none for whom may not refund this student. When they cannot be read
   * (Stripe unconfigured or down for a card payment) the error is logged and the sheet says so
   * («تعذّر حساب الاسترداد الآن»): «إلغاء فقط» never waits on Stripe; the stop's plan answers 503.
   */
  async preview(user: AuthUser, sub: RefundSub): Promise<RefundPreview> {
    const allowed = can(user, 'subscriptions.refund') && (await this.owns(user, sub.studentId));
    return allowed ? this.read(sub) : NONE;
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

  private read(sub: RefundSub): Promise<RefundPreview> {
    return this.refunds.preview(sub).then(
      (refund) => ({ refund, unavailable: false }),
      (error: unknown) => {
        this.log.warn(`course-stop refund preview failed for ${sub.id}: ${String(error)}`);
        return { refund: null, unavailable: true };
      },
    );
  }

  /** Every student while the rule is off or for a non-assistant; else only hers. */
  private async owns(user: AuthUser, studentId: string): Promise<boolean> {
    const own = isAssistant(user) ? await this.rule.scope(user) : null;
    return own === null || own.studentIds.includes(studentId);
  }
}
