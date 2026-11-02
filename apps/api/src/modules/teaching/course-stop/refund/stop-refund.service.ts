import {
  refundAmountProblem,
  splitRefund,
  stopRefund,
  type CourseStopRefunded,
  type StopRefund,
} from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { conflict } from '@/common/http/errors';
import { uuidFor } from '@/modules/finance/stripe';
import { StopRefundCards, type CardState } from './stop-refund.cards';
import { StopRefundRepo, type MoneyRow } from './stop-refund.repo';
import {
  manualRefundKey,
  replayMismatch,
  type RefundPlan,
  type RefundSub,
} from './stop-refund.plan';
import { StopRefundLedger } from './stop-refund.ledger';
import { CourseStopSettings } from './course-stop.settings';

const net = (rows: readonly MoneyRow[]): number =>
  rows.reduce((sum, r) => sum + (r.kind === 'refund' ? -r.amount : r.amount), 0);

/**
 * «إلغاء مع استرداد» (owner 2026-11-02): refund = net paid − attended × (price / lessons) × the
 * rate setting, floored at 0 (stopRefund). The person may lower it. Card payments of a payment
 * link are refunded through Stripe first (the webhook records their rows), the rest is one manual
 * refund row plus an admin bell «حوّل … للعائلة». Every leg is idempotent on the stop's
 * clientRequestId: this stop's own refunds are left out of «net paid» (other refunds still
 * pending in Stripe are taken off it), so a replay plans the same split and creates nothing twice;
 * a replay asking another split is 409 refund_mismatch. A converted or 3-decimal card payment is
 * refunded by hand (the manual leg).
 */
@Injectable()
export class StopRefunds {
  constructor(
    private readonly repo: StopRefundRepo,
    private readonly cards: StopRefundCards,
    private readonly ledger: StopRefundLedger,
    private readonly settings: CourseStopSettings,
  ) {}

  /** The sheet's lines (no Stripe call): what was paid net, at the current rate. */
  async preview(sub: RefundSub, paid: number): Promise<StopRefund> {
    const [pkg, rate] = await Promise.all([this.repo.pkg(sub.id), this.rate()]);
    return stopRefund({ ...pkg, paid, ratePercent: rate, currency: sub.currency });
  }

  /** 409 refund_exceeds_allowed above the computed refund; 503 stripe_not_configured with cards. */
  async plan(input: { sub: RefundSub; requestId: string; amount: number }): Promise<RefundPlan> {
    const { sub, requestId } = input;
    const [pkg, rate, rows] = await Promise.all([
      this.repo.pkg(sub.id),
      this.rate(),
      this.repo.money(sub.id),
    ]);
    const intents = await this.repo.intents(rows.map((r) => r.id));
    const cards = await this.cards.states({ rows, intents, requestId });
    const manualKey = manualRefundKey(requestId);
    const mineIds = cards.flatMap((c) => c.mine.map((r) => uuidFor(r.id)));
    const own = new Set([manualKey, ...mineIds]);
    const pending = cards.reduce((n, c) => n + c.unrecorded, 0);
    const paid = net(rows.filter((r) => !own.has(r.client_request_id ?? ''))) - pending;
    const { currency } = sub;
    const calc = stopRefund({ ...pkg, paid, ratePercent: rate, currency });
    if (refundAmountProblem(input.amount, calc.refund, currency))
      throw conflict('refund_exceeds_allowed');
    const legs = cards.map((c) => ({ id: c.paymentId, refundable: c.refundable }));
    const split = splitRefund({ amount: input.amount, cards: legs, currency });
    const manualRow = rows.find((r) => r.client_request_id === manualKey)?.amount ?? null;
    if (replayMismatch({ cards, split, manualRow, currency })) throw conflict('refund_mismatch');
    return { sub, pkg, calc, cards, rows, requestId, amount: input.amount, split };
  }

  /** After the stop committed (again on a replay): card legs, then the manual leg, audited. */
  async execute(input: {
    plan: RefundPlan;
    actor: { id: string; reason: string };
  }): Promise<CourseStopRefunded> {
    const { plan } = input;
    const { amount, split } = plan;
    const byId = new Map(plan.cards.map((c) => [c.paymentId, c]));
    const legs = split.cards.flatMap((leg) => {
      const card = byId.get(leg.id);
      return card ? [{ card, take: leg.amount }] : [];
    });
    const fresh = await Promise.all(
      legs.map((leg) => this.cardLeg({ ...leg, requestId: plan.requestId })),
    );
    const card = legs.reduce((sum, leg) => sum + leg.take, 0);
    const result = { amount, card: Math.round(card * 100) / 100, manual: split.manual };
    // The manual row audits itself (PaymentsService); a new Stripe refund gets its own row.
    const stripe = fresh.flat();
    if (stripe.length > 0)
      await this.ledger.audit({ plan, result, stripe, actorId: input.actor.id });
    await this.ledger.manual({ plan, amount: split.manual, actor: input.actor });
    return result;
  }

  /** The Stripe refund it created; none for a card this stop already refunded (a replay). */
  private async cardLeg(leg: {
    card: CardState;
    take: number;
    requestId: string;
  }): Promise<string[]> {
    if (leg.card.mine.length > 0) return [];
    return [
      await this.cards.refund({ card: leg.card, amount: leg.take, requestId: leg.requestId }),
    ];
  }

  private async rate(): Promise<number> {
    return (await this.settings.read()).refund_attended_rate_percent;
  }
}
