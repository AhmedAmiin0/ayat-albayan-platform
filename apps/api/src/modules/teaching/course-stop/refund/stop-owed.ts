import { owedAmountProblem, owedByChoice, stopRefund, type StopOwe, type StopOweAsk } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { conflict } from '@/common/http/errors';
import { CourseStopSettings } from './course-stop.settings';
import type { OwedDecision, RefundSub } from './stop-refund.plan';
import { StopRefundRepo } from './stop-refund.repo';

/** choose()'s input: the package, the ask, the sheet's numbers, a replay's stored decision. */
interface ChooseIn {
  sub: RefundSub;
  ask: StopOweAsk | undefined;
  owe: StopOwe;
  stored: OwedDecision | null;
}

/** The same option (and the same typed amount for custom) as the stored decision. */
const keepsStored = (stored: OwedDecision, ask: StopOweAsk): boolean =>
  stored.choice === ask.choice && (ask.choice !== 'custom' || stored.amount === ask.amount);

/** No `owe` in the body (an older client): the sheet's default, attended × rate. */
const DEFAULT_ASK: StopOweAsk = { choice: 'attended' };

/**
 * «إلغاء فقط» (owner 2026-11-06): what the family still owes, chosen by the person stopping:
 * attended × per-lesson price × the rate (default, capped at the price), the price, nothing, or a
 * custom amount 0..price (409 owed_exceeds_price). Computed once at the stop and stored
 * (stop_owed_amount): a later rate change never rewrites it.
 */
@Injectable()
export class StopOwedCalc {
  constructor(
    private readonly repo: StopRefundRepo,
    private readonly settings: CourseStopSettings,
  ) {}

  /** The sheet's numbers for every person who may stop (no refund key needed). */
  async owe(sub: RefundSub): Promise<StopOwe> {
    const [pkg, settings] = await Promise.all([this.repo.pkg(sub.id), this.settings.read()]);
    const ratePercent = settings.refund_attended_rate_percent;
    const calc = stopRefund({ ...pkg, paid: 0, ratePercent, currency: sub.currency });
    return { charged: calc.charged, price: pkg.price };
  }

  /**
   * The decision for `ask` against `owe` (the sheet's numbers). A retry of a stop that already
   * committed with the same option keeps what it stored (never a live recompute); another option
   * goes on to stop_course, which answers 409 stop_mismatch.
   */
  choose(input: ChooseIn): OwedDecision {
    const { choice, amount: custom } = input.ask ?? DEFAULT_ASK;
    const { stored } = input;
    if (stored && keepsStored(stored, { choice, amount: custom })) return stored;
    const amount = owedByChoice(choice, input.owe, custom ?? 0);
    const problem = owedAmountProblem(amount, input.owe.price, input.sub.currency);
    if (problem) throw conflict(problem);
    return { amount, choice };
  }
}
