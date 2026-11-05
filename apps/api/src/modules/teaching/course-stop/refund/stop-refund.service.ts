import {
  owedAfterRefund,
  refundAmountProblem,
  refundByChoice,
  splitRefund,
  stopRefund,
  type CourseStopRefunded,
  type StopRefund,
  type StopRefundChoice,
} from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { conflict } from '@/common/http/errors';
import { uuidFor } from '@/modules/finance/stripe';
import { StopRefundCards, type CardState } from './stop-refund.cards';
import { StopRefundRepo, type MoneyRow, type RefundPackage } from './stop-refund.repo';
import {
  manualRefundKey,
  replayMismatch,
  type RefundPlan,
  type RefundSub,
} from './stop-refund.plan';
import { StopRefundLedger } from './stop-refund.ledger';
import { CourseStopSettings } from './course-stop.settings';

/** The preview's request: no stop yet, so none of the package's refunds is this stop's own. */
const PREVIEW_REQUEST = 'course-stop-preview';

interface Allowed {
  pkg: RefundPackage;
  rows: MoneyRow[];
  cards: CardState[];
  calc: StopRefund;
}

const net = (rows: readonly MoneyRow[]): number =>
  rows.reduce((sum, r) => sum + (r.kind === 'refund' ? -r.amount : r.amount), 0);

/** The refund the person chose in the sheet (owner 2026-11-06); custom carries its amount. */
export interface RefundChoiceAsk {
  choice: StopRefundChoice;
  amount?: number | undefined;
}

/**
 * «إلغاء مع استرداد» (owner 2026-11-02, choices 2026-11-06): the person picks the unattended
 * lessons (net paid − attended × (price / lessons) × the rate setting, floored at 0: stopRefund),
 * everything paid, or a custom amount; every choice at most the net paid (pending Stripe refunds
 * off). After it the course owes the net paid left (plan.owed: nothing more is due). Card payments of a payment
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

  /**
   * The sheet's lines: the same allowed refund the stop plans (pending Stripe refunds taken off),
   * so the sheet's default amount never meets 409 refund_exceeds_allowed.
   */
  async preview(sub: RefundSub): Promise<StopRefund> {
    return (await this.allowed(sub, PREVIEW_REQUEST)).calc;
  }

  /** 409 refund_exceeds_allowed above the net paid; 503 stripe_not_configured with cards. */
  async plan(input: { sub: RefundSub; requestId: string; ask: RefundChoiceAsk }): Promise<RefundPlan> {
    const { sub, requestId, ask } = input;
    const { currency } = sub;
    const { pkg, rows, cards, calc } = await this.allowed(sub, requestId);
    const amount = refundByChoice(ask.choice, calc, ask.amount ?? 0);
    if (refundAmountProblem(amount, calc.paid, currency)) throw conflict('refund_exceeds_allowed');
    const manualKey = manualRefundKey(requestId);
    const legs = cards.map((c) => ({ id: c.paymentId, refundable: c.refundable }));
    const split = splitRefund({ amount, cards: legs, currency });
    const manualRow = rows.find((r) => r.client_request_id === manualKey)?.amount ?? null;
    if (replayMismatch({ cards, split, manualRow, currency })) throw conflict('refund_mismatch');
    const owed = { amount: owedAfterRefund(calc, amount, currency), choice: `refund_${ask.choice}` };
    return { sub, pkg, calc, cards, rows, requestId, amount, split, owed };
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

  /**
   * What this stop may refund: net paid with its own refunds left out (a replay plans the same)
   * and the other refunds still pending in Stripe taken off, minus the attended charge.
   */
  private async allowed(sub: RefundSub, requestId: string): Promise<Allowed> {
    const [pkg, settings, rows] = await Promise.all([
      this.repo.pkg(sub.id),
      this.settings.read(),
      this.repo.money(sub.id),
    ]);
    const intents = await this.repo.intents(rows.map((r) => r.id));
    const cards = await this.cards.states({ rows, intents, requestId });
    const mineIds = cards.flatMap((c) => c.mine.map((r) => uuidFor(r.id)));
    const own = new Set([manualRefundKey(requestId), ...mineIds]);
    const pending = cards.reduce((n, c) => n + c.unrecorded, 0);
    const paid = net(rows.filter((r) => !own.has(r.client_request_id ?? ''))) - pending;
    const ratePercent = settings.refund_attended_rate_percent;
    const calc = stopRefund({ ...pkg, paid, ratePercent, currency: sub.currency });
    return { pkg, rows, cards, calc };
  }
}
