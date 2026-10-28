import { effectiveLinkStatus, paymentLinkUrl } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { StripeClients, type StripeApi } from '../gate/stripe-clients';
import { LinkViews } from '../links/link-views';
import { statusOf } from '../links/payment-links.mapper';
import { PaymentLinksQueries, type LinkRow } from '../links/payment-links.queries';
import { checkoutParams } from './checkout-params';

/**
 * GET /pay/:token/checkout: where the payer's browser goes. An open link reuses its Checkout Session while
 * that is still open, else gets a new one (compare-and-set on the link: of two racing clicks one session
 * wins, the other is expired at once, so a link never has two payable sessions). Anything else (paid,
 * expired, cancelled, processing, unknown) goes back to the platform's page, which says why.
 */
@Injectable()
export class CheckoutService {
  private readonly log = new Logger(CheckoutService.name);

  constructor(
    private readonly links: PaymentLinksQueries,
    private readonly clients: StripeClients,
    private readonly views: LinkViews,
  ) {}

  async target(token: string, now = new Date()): Promise<string> {
    const page = paymentLinkUrl(this.views.webOrigin(), token);
    const link = await this.links.byToken(token);
    if (!link || !link.subscription_id || link.processing) return page;
    if (effectiveLinkStatus({ status: statusOf(link), expires_at: link.expires_at }, now) !== 'open') return page;
    const stripe = await this.clients.client().catch(() => null);
    if (!stripe) return page; // keys missing or refused: the family sees the platform page, never a JSON error
    if (link.stripe_session_id) {
      const current = await stripe.checkout.sessions.retrieve(link.stripe_session_id);
      if (current.status === 'open' && current.url) return current.url;
      if (current.status === 'complete') return page; // paid or pending: the webhook decides
    }
    return this.fresh({ stripe, link, now, page });
  }

  private async fresh(c: { stripe: StripeApi; link: LinkRow; now: Date; page: string }): Promise<string> {
    const created = await c.stripe.checkout.sessions.create(checkoutParams(c.link, { webOrigin: this.views.webOrigin(), now: c.now }));
    if (await this.links.setSession({ id: c.link.id, prev: c.link.stripe_session_id, session: created.id })) return created.url ?? c.page;
    await this.expire(c.stripe, created.id); // lost the race: the winner's session is the link's
    const winner = (await this.links.get(c.link.id))?.stripe_session_id;
    if (!winner) return c.page;
    const session = await c.stripe.checkout.sessions.retrieve(winner);
    return session.status === 'open' && session.url ? session.url : c.page;
  }

  private async expire(stripe: StripeApi, id: string): Promise<void> {
    try {
      await stripe.checkout.sessions.expire(id);
    } catch (e) {
      this.log.warn(`checkout session not expired: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
