import { owedAmountProblem, owedByChoice, stopRefund, type StopOwe, type StopOweAsk } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { conflict } from '@/common/http/errors';
import { CourseStopSettings } from './course-stop.settings';
import type { OwedDecision, RefundSub } from './stop-refund.plan';
import { StopRefundRepo } from './stop-refund.repo';

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

  async decide(sub: RefundSub, ask: StopOweAsk | undefined): Promise<OwedDecision> {
    const { choice, amount: custom } = ask ?? DEFAULT_ASK;
    const owe = await this.owe(sub);
    const amount = owedByChoice(choice, owe, custom ?? 0);
    const problem = owedAmountProblem(amount, owe.price, sub.currency);
    if (problem) throw conflict(problem);
    return { amount, choice };
  }
}
