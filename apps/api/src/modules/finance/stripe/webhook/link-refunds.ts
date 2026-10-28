import { fromMinorUnits } from '@ab/shared';
import { HttpException, Injectable } from '@nestjs/common';
import type Stripe from 'stripe';
import { errorCode } from '../../../../common/http/errors';
import { ar } from '../../../../common/i18n/server-text';
import { StripeClients, type StripeApi } from '../gate/stripe-clients';
import { uuidFor } from '../links/link-ids';
import type { LinkRow } from '../links/payment-links.queries';
import { idOf, pastIso } from './link-fulfilment';
import { WebhookDeps } from './webhook-deps';

/**
 * charge.refunded → one refund payment per Stripe Refund (client_request_id = a uuid of the refund id), so a
 * replayed or out-of-order event never counts a refund twice and the paid rule and the commission re-evaluate
 * as for an admin's «استرداد». charge.dispute.created → a bell row for the admins only, nothing changed.
 */
@Injectable()
export class LinkRefunds {
  constructor(
    private readonly deps: WebhookDeps,
    private readonly clients: StripeClients,
  ) {}

  async refunded(charge: Stripe.Charge): Promise<string> {
    const stripe = await this.clients.client();
    const link = await this.linkOfIntent(stripe, idOf(charge.payment_intent));
    if (!link?.subscription_id) return 'unknown_link';
    // The refund of a payment not recorded yet (its event still on its way): fail, so Stripe retries later.
    if (!link.paid_payment_id) throw new Error('stripe refund before its payment was recorded');
    const refunds = await stripe.refunds.list({ charge: charge.id, limit: 100 });
    let recorded = 0;
    for (const r of refunds.data) {
      if (r.status !== 'succeeded') continue;
      recorded += await this.record(link, r);
    }
    return `refunds:${recorded}`;
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
