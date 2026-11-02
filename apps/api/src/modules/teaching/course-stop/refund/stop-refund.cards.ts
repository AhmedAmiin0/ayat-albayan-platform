import { fromMinor, fromMinorUnits, toMinor, toMinorUnits } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type Stripe from 'stripe';
import { StripeClients, type StripeApi } from '@/modules/finance/stripe';
import type { MoneyRow } from './stop-refund.repo';

/** A card payment of a payment link, as Stripe can still refund it. */
export interface CardState {
  paymentId: string;
  intent: string;
  /** In the package currency: what the split may take from this card. */
  refundable: number;
  /** In the charge currency (the same unless the payment was converted on record). */
  chargeRefundable: number;
  /** This stop's own refunds on the card (a replay creates none). */
  mine: string[];
}

/** A refund that still counts (pending or done). */
const LIVE = new Set<string>(['succeeded', 'pending', 'requires_action']);
const isMine = (r: Stripe.Refund, requestId: string): boolean =>
  r.metadata?.course_stop === requestId;

/** The idempotency key of one card refund of one stop (Stripe keeps it 24 h; `mine` beyond). */
export const cardRefundKey = (requestId: string, paymentId: string): string =>
  `course-stop-refund:${requestId}:${paymentId}`;

/**
 * The Stripe part of «إلغاء مع استرداد» (owner 2026-11-02): what each payment-link card can still
 * refund (its other refunds listed from Stripe, this stop's own left out so a replay plans the
 * same split) and the refund itself. The webhook (LinkRefunds) records the refund row, once.
 */
@Injectable()
export class StopRefundCards {
  constructor(private readonly clients: StripeClients) {}

  async states(input: {
    rows: readonly MoneyRow[];
    intents: ReadonlyMap<string, string>;
    requestId: string;
  }): Promise<CardState[]> {
    const cards = input.rows.filter((r) => r.kind === 'payment' && input.intents.has(r.id));
    if (cards.length === 0) return [];
    const stripe = await this.clients.client();
    return Promise.all(
      cards.map((row) =>
        this.state(stripe, {
          row,
          intent: input.intents.get(row.id) ?? '',
          requestId: input.requestId,
        }),
      ),
    );
  }

  /** One partial (or whole) refund of the card, tagged with the stop. */
  async refund(input: { card: CardState; amount: number; requestId: string }): Promise<string> {
    const stripe = await this.clients.client();
    const params = {
      payment_intent: input.card.intent,
      amount: toMinorUnits(input.amount),
      reason: 'requested_by_customer' as const,
      metadata: { course_stop: input.requestId, payment_id: input.card.paymentId },
    };
    const refund = await stripe.refunds.create(params, {
      idempotencyKey: cardRefundKey(input.requestId, input.card.paymentId),
    });
    return refund.id;
  }

  private async state(
    stripe: StripeApi,
    c: { row: MoneyRow; intent: string; requestId: string },
  ): Promise<CardState> {
    const listed = await stripe.refunds.list({ payment_intent: c.intent, limit: 100 });
    const live = listed.data.filter((r) => LIVE.has(r.status ?? ''));
    const other = live.filter((r) => !isMine(r, c.requestId)).reduce((sum, r) => sum + r.amount, 0);
    const gross = c.row.original_amount ?? c.row.amount;
    const chargeRefundable = Math.max(0, fromMinorUnits(toMinorUnits(gross) - other));
    const currency = c.row.currency;
    const share = gross > 0 ? (chargeRefundable * c.row.amount) / gross : 0;
    return {
      paymentId: c.row.id,
      intent: c.intent,
      refundable: fromMinor(toMinor(share, currency), currency),
      chargeRefundable,
      mine: live.filter((r) => isMine(r, c.requestId)).map((r) => r.id),
    };
  }
}
