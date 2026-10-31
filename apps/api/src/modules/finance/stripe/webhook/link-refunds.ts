import { fromMinorUnits } from '@ab/shared';
import { HttpException, Injectable } from '@nestjs/common';
import type Stripe from 'stripe';
import { errorCode } from '@/common/http/errors';
import { ar } from '@/common/infra/i18n/server-text';
import { StripeClients, type StripeApi } from '@/modules/finance/stripe/gate/stripe-clients';
import { uuidFor } from '@/modules/finance/stripe/links/link-ids';
import type { LinkRow } from '@/modules/finance/stripe/links/payment-links.queries';
import { idOf, pastIso } from './link-fulfilment';
import { WebhookDeps } from './webhook-deps';

/** How long a refund waits (Stripe retries) for the payment it reverses to be recorded. */
const RETRY_MS = 60 * 60_000;

/**
 * charge.refunded → one refund payment per Stripe Refund (client_request_id = a uuid of the refund id), so a
 * replayed or out-of-order event never counts a refund twice and the paid rule and the commission re-evaluate
 * as for an admin's «استرداد» (refund.updated catches one still pending then). charge.dispute.created → a bell row for the admins only, nothing changed.
 */
@Injectable()
export class LinkRefunds {
  constructor(
    private readonly deps: WebhookDeps,
    private readonly clients: StripeClients,
  ) {}

  async refunded(charge: Stripe.Charge): Promise<string> {
    return this.refundsOf({ paymentIntent: idOf(charge.payment_intent), charge: charge.id, created: charge.created });
  }

  /** refund.updated: a refund pending at charge.refunded that has now succeeded. */
  async updated(refund: Stripe.Refund): Promise<string> {
    const charge = idOf(refund.charge);
    if (refund.status !== 'succeeded' || !charge) return 'ignored';
    return this.refundsOf({ paymentIntent: idOf(refund.payment_intent), charge, created: refund.created });
  }

  private async refundsOf(c: { paymentIntent: string | null; charge: string; created: number }): Promise<string> {
    const stripe = await this.clients.client();
    const link = await this.linkOfIntent(stripe, c.paymentIntent);
    if (!link?.subscription_id) return 'unknown_link';
    if (!link.paid_payment_id) return this.unrecorded(link, c);
    const refunds = await stripe.refunds.list({ charge: c.charge, limit: 100 });
    let recorded = 0;
    for (const r of refunds.data) {
      if (r.status !== 'succeeded') continue;
      recorded += await this.record(link, r);
    }
    return `refunds:${recorded}`;
  }

  /**
   * A refund of a payment the platform has not recorded: its event may still be on its way (async pending, or
   * within the hour) → fail so Stripe retries; else (the payment was refused) → the admins settle it by hand.
   */
  private async unrecorded(link: LinkRow, c: { charge: string; created: number }): Promise<string> {
    if (link.processing || Date.now() - c.created * 1000 < RETRY_MS) throw new Error('stripe refund before its payment was recorded');
    await this.deps.alerts.admins({ subject: `stripe_refund_unrecorded:${c.charge}`, title: ar.paymentLinks.bell.refusedTitle, text: c.charge, link });
    return 'refund_alerted';
  }

  async disputed(dispute: Stripe.Dispute): Promise<string> {
    const link = await this.linkOfIntent(await this.clients.client(), idOf(dispute.payment_intent));
    const text = `${fromMinorUnits(dispute.amount)} ${dispute.currency.toUpperCase()} — ${ar.paymentLinks.bell.disputeBody}`;
    await this.deps.alerts.admins({ subject: `stripe_dispute:${dispute.id}`, title: ar.paymentLinks.bell.disputeTitle, text, link });
    return 'dispute_alert';
  }

  private async record(link: LinkRow, refund: Stripe.Refund): Promise<number> {
    const subscriptionId = link.subscription_id ?? '';
    const amount = fromMinorUnits(refund.amount);
    const currency = refund.currency.toUpperCase();
    try {
      await this.deps.payments.create(
        { subscriptionId, amount, currency, kind: 'refund', method: 'card', paidAt: pastIso(refund.created), note: `Stripe ${refund.id}`, clientRequestId: uuidFor(refund.id) },
        link.created_by,
      );
      return 1;
    } catch (e) {
      if (!(e instanceof HttpException) || e.getStatus() >= 500) throw e;
      const text = `${amount} ${currency} (${errorCode(e) ?? 'refused'})`;
      await this.deps.alerts.admins({ subject: `stripe_refund_refused:${refund.id}`, title: ar.paymentLinks.bell.refusedTitle, text, link });
      return 0;
    }
  }

  /** The link of a PaymentIntent: saved when it was paid, else found through its Checkout Session. */
  private async linkOfIntent(stripe: StripeApi, paymentIntent: string | null): Promise<LinkRow | null> {
    if (!paymentIntent) return null;
    const saved = await this.deps.links.byPaymentIntent(paymentIntent);
    if (saved) return saved;
    const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntent, limit: 1 });
    const id = sessions.data[0]?.client_reference_id;
    return id && /^[0-9a-f-]{36}$/.test(id) ? this.deps.links.get(id) : null;
  }
}
