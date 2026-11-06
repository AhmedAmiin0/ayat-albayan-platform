import {
  oweLowersDefault,
  type CourseStopRefunded,
  type StopOwe,
  type StopOweAsk,
  type StopRefund,
} from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { can } from '@/common/auth/permissions';
import type { AuthUser } from '@/common/auth/verify-token';
import { forbidden } from '@/common/http/errors';
import { SalesOwnershipRule } from '@/modules/sales/sales';
import { StopOwedCalc } from './stop-owed';
import { StopRefundLedger } from './stop-refund.ledger';
import type { OwedDecision, RefundPlan, RefundSub } from './stop-refund.plan';
import { StopRefunds, type RefundChoiceAsk } from './stop-refund.service';

/** Who the assistant ownership rule binds: the sales base role; the admin never (#612). */
const isAssistant = (user: AuthUser): boolean => user.role === 'sales';

/** The refund leg of one stop: the package, its key, the choice. */
interface RefundAsk {
  sub: RefundSub;
  requestId: string;
  ask: RefundChoiceAsk;
  /** The decision a stop with this request already stored (a replay); null before it. */
  stored: OwedDecision | null;
}

/** A plain stop's owe: the package, the ask, a replay's stored decision. */
interface OweAsk {
  sub: RefundSub;
  ask: StopOweAsk | undefined;
  stored: OwedDecision | null;
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
 * refund lines only to whom the stop would let refund. «إلغاء فقط» below the default (nothing, or
 * a custom amount under attended × rate) forgives money: the same checks (review 2026-11-06).
 */
@Injectable()
export class StopRefundGate {
  private readonly log = new Logger(StopRefundGate.name);

  constructor(
    private readonly refunds: StopRefunds,
    private readonly rule: SalesOwnershipRule,
    private readonly owed: StopOwedCalc,
    private readonly ledger: StopRefundLedger,
  ) {}

  /** «إلغاء فقط»'s numbers (attended × rate, the price): no refund key needed. */
  owe(sub: RefundSub): Promise<StopOwe> {
    return this.owed.owe(sub);
  }

  /**
   * What a plain stop leaves owed (409 owed_exceeds_price for a custom amount above the price);
   * below the default: 403 refund_not_allowed / not_your_student, as a refund.
   */
  async decide(actor: AuthUser, input: OweAsk): Promise<OwedDecision> {
    const owe = await this.owed.owe(input.sub);
    if (oweLowersDefault(input.ask, owe, input.sub.currency))
      await this.mayRefund(actor, input.sub);
    return this.owed.choose({ ...input, owe });
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
    await this.mayRefund(actor, ask.sub);
    return this.refunds.plan(ask);
  }

  /**
   * After the stop committed. When it throws (Stripe error, crash) the stop already stored the
   * refund (stop_owed_amount): the admins' bell says it is half done; a retry finishes it.
   */
  execute(input: Parameters<StopRefunds['execute']>[0]): Promise<CourseStopRefunded> {
    return this.refunds.execute(input).catch(async (error: unknown) => {
      await this.ledger.failed(input.plan).catch((bell: unknown) => {
        this.log.error(`course-stop refund bell failed for ${input.plan.sub.id}: ${String(bell)}`);
      });
      throw error;
    });
  }

  private async mayRefund(actor: AuthUser, sub: RefundSub): Promise<void> {
    if (!can(actor, 'subscriptions.refund')) throw forbidden('refund_not_allowed');
    if (!(await this.owns(actor, sub.studentId))) throw forbidden('not_your_student');
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
