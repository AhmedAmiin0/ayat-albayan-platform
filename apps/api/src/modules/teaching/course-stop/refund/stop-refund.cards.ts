import { fromMinorUnits, toMinorUnits } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type Stripe from 'stripe';
import { StripeClients, uuidFor, type StripeApi } from '@/modules/finance/stripe';
import type { MoneyRow } from './stop-refund.repo';

/** A card payment of a payment link, as Stripe can still refund it (package currency). */
export interface CardState {
  paymentId: string;
  intent: string;
  /** What the split may take from this card: its amount − every other live refund. */
  refundable: number;
  /** This stop's own refunds on the card (a replay creates none). */
  mine: { id: string; amount: number }[];
  /** Other live refunds the platform has no row of yet (pending): out of «paid» too. */
  unrecorded: number;
}

/** A refund that still counts (pending or done). */
const LIVE = new Set<string>(['succeeded', 'pending', 'requires_action']);
/** Stripe counts these in 1/1000 (the links charge ×100): such a payment is refunded by hand. */
const THREE_DECIMALS = new Set(['KWD', 'OMR', 'BHD', 'JOD']);
const isMine = (r: Stripe.Refund, requestId: string): boolean =>
  r.metadata?.course_stop === requestId;
const sum = (refunds: readonly Stripe.Refund[]): number =>
  fromMinorUnits(refunds.reduce((n, r) => n + r.amount, 0));

/**
 * A card the stop refunds through Stripe: a payment link's, charged in the package currency
 * (a payment converted on record would come back at another rate) with 2 decimals.
 */
const isStripeCard = (row: MoneyRow, intents: ReadonlyMap<string, string>): boolean =>
  row.kind === 'payment' &&
  intents.has(row.id) &&
  row.original_currency === null &&
  !THREE_DECIMALS.has(row.currency);

/** The idempotency key of one card refund of one stop (Stripe keeps it 24 h; `mine` beyond). */
export const cardRefundKey = (requestId: string, paymentId: string): string =>
  `course-stop-refund:${requestId}:${paymentId}`;

interface StatesInput {
  rows: readonly MoneyRow[];
  intents: ReadonlyMap<string, string>;
  requestId: string;
}

/**
 * The Stripe part of «إلغاء مع استرداد» (owner 2026-11-02): what each payment-link card can still
 * refund (every refund listed from Stripe, this stop's own kept apart so a replay plans the same
 * split) and the refund itself. The webhook (LinkRefunds) records the refund row, once.
 */
@Injectable()
export class StopRefundCards {
  constructor(private readonly clients: StripeClients) {}

  async states(input: StatesInput): Promise<CardState[]> {
    const cards = input.rows.filter((r) => isStripeCard(r, input.intents));
    if (cards.length === 0) return [];
    const stripe = await this.clients.client();
    const recorded = new Set(input.rows.map((r) => r.client_request_id));
    return Promise.all(
      cards.map((row) => {
        const intent = input.intents.get(row.id) ?? '';
        return this.state(stripe, { row, intent, requestId: input.requestId, recorded });
      }),
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
    c: { row: MoneyRow; intent: string; requestId: string; recorded: ReadonlySet<string | null> },
  ): Promise<CardState> {
    const listed = await stripe.refunds
      .list({ payment_intent: c.intent, limit: 100 })
      .autoPagingToArray({ limit: 10_000 });
    const live = listed.filter((r) => LIVE.has(r.status ?? ''));
    const other = live.filter((r) => !isMine(r, c.requestId));
    const mine = live.filter((r) => isMine(r, c.requestId));
    return {
      paymentId: c.row.id,
      intent: c.intent,
      refundable: Math.max(
        0,
        fromMinorUnits(toMinorUnits(c.row.amount) - toMinorUnits(sum(other))),
      ),
      mine: mine.map((r) => ({ id: r.id, amount: fromMinorUnits(r.amount) })),
      unrecorded: sum(other.filter((r) => !c.recorded.has(uuidFor(r.id)))),
    };
  }
}
