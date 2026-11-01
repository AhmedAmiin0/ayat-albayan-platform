import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import type Stripe from 'stripe';
import { ar } from '@/common/infra/i18n/server-text';
import { badRequest } from '../../../../common/http/errors';
import { StripeClients } from '../gate/stripe-clients';
import { LinkAlerts } from './link-alerts';
import { LinkFulfilment } from './link-fulfilment';
import { LinkRefunds } from './link-refunds';
import { StripeEventsQueries } from './stripe-events.queries';

/** The event handlers (rule 2: at most 3 constructor parameters). */
@Injectable()
export class WebhookHandlers {
  constructor(
    readonly fulfil: LinkFulfilment,
    readonly refunds: LinkRefunds,
    readonly alerts: LinkAlerts,
  ) {}
}

type WebhookPost = { rawBody: Buffer | undefined; signature: string | undefined };

/**
 * POST /webhooks/stripe (docs/30): the ONLY place a link is fulfilled. The signature is checked
 * on the raw bytes Stripe sent (400 bad_signature, nothing stored). The saved key's mode is the
 * server's (stripeServerKey): a sandbox event under a live key is test money, recorded as
 * mode_mismatch and closed; a live event on a server not in live mode (FEATURE_STRIPE back to
 * test) is real money, never closed: 503 so Stripe retries, and the admins get a bell. Each event
 * is handled once (stripe_events, by event.id), every step idempotent on its own.
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
    const result = await this.route(event);
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

  private async route(event: Stripe.Event): Promise<string> {
    if (event.livemode === this.clients.liveMode()) return this.dispatch(event);
    if (!event.livemode) return 'mode_mismatch';
    return this.liveRefused(event);
  }

  /** Real money the server cannot take now: left open (processed_at null) for Stripe's retries. */
  private async liveRefused(event: Stripe.Event): Promise<never> {
    const text = `${event.type} ${event.id}`;
    const title = ar.paymentLinks.bell.refusedTitle;
    await this.handlers.alerts.admins({ subject: `stripe_mode_mismatch:${event.id}`, title, text, link: null });
    this.log.warn(`stripe live ${event.type} ${event.id}: FEATURE_STRIPE is not live, 503`);
    const code = 'stripe_live_not_enabled';
    throw new HttpException({ code, message: code }, HttpStatus.SERVICE_UNAVAILABLE);
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
