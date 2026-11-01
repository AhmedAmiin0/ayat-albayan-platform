import { Injectable, Logger } from '@nestjs/common';
import type Stripe from 'stripe';
import { badRequest } from '../../../../common/http/errors';
import { StripeClients } from '../gate/stripe-clients';
import { LinkFulfilment } from './link-fulfilment';
import { LinkRefunds } from './link-refunds';
import { StripeEventsQueries } from './stripe-events.queries';

/** The event handlers (rule 2: at most 3 constructor parameters). */
@Injectable()
export class WebhookHandlers {
  constructor(
    readonly fulfil: LinkFulfilment,
    readonly refunds: LinkRefunds,
  ) {}
}

type WebhookPost = { rawBody: Buffer | undefined; signature: string | undefined };

/**
 * POST /webhooks/stripe (docs/30): the ONLY place a link is fulfilled. The signature is checked
 * on the raw bytes Stripe sent (400 bad_signature, nothing stored). An event whose mode is not
 * the saved key's (a live event with a sandbox key, or a sandbox event with a live key) is
 * recorded as mode_mismatch and not dispatched. Each event is handled once (stripe_events, by
 * event.id), every step idempotent on its own.
 */
@Injectable()
export class StripeWebhookService {
  private readonly log = new Logger(StripeWebhookService.name);

  constructor(
    private readonly clients: StripeClients,
    private readonly events: StripeEventsQueries,
    private readonly handlers: WebhookHandlers,
  ) {}

  async handle(post: WebhookPost): Promise<{ received: true }> {
    const event = await this.verify(post);
    if (await this.events.begin(event)) return { received: true }; // a duplicate delivery
    const result = event.livemode === this.clients.liveMode() ? await this.dispatch(event) : 'mode_mismatch';
    await this.events.done(event.id, result);
    this.log.log(`stripe ${event.type} ${event.id}: ${result}`);
    return { received: true };
  }

  private async verify(post: WebhookPost): Promise<Stripe.Event> {
    if (!post.rawBody || !post.signature) throw badRequest('bad_signature');
    const [stripe, secret] = await Promise.all([this.clients.client(), this.clients.webhookSecret()]);
    try {
      return stripe.webhooks.constructEvent(post.rawBody, post.signature, secret);
    } catch {
      throw badRequest('bad_signature');
    }
  }

  private async dispatch(event: Stripe.Event): Promise<string> {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        if (session.payment_status === 'unpaid') return this.handlers.fulfil.pending(session);
        return this.handlers.fulfil.paid(session, event.created);
      }
      case 'checkout.session.async_payment_failed':
        return this.handlers.fulfil.failed(event.data.object);
      case 'charge.refunded':
        return this.handlers.refunds.refunded(event.data.object);
      case 'refund.updated':
        return this.handlers.refunds.updated(event.data.object);
      case 'charge.dispute.created':
        return this.handlers.refunds.disputed(event.data.object);
      default:
        return 'ignored';
    }
  }
}
