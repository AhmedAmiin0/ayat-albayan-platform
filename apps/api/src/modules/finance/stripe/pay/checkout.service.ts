import { effectiveLinkStatus, paymentLinkUrl } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { StripeClients, type StripeApi } from '../gate/stripe-clients';
import { LinkDeps } from '../links/link-deps';
import { LinkPackages } from '../links/link-packages';
import { statusOf } from '../links/payment-links.mapper';
import type { LinkRow } from '../links/payment-links.queries';
import { checkoutParams } from './checkout-params';

/**
 * GET /pay/:token/checkout: where the payer's browser goes. An open link reuses its Checkout Session while
 * that is still open, else gets a new one (compare-and-set on the link: of two racing clicks one session
 * wins, the other is expired at once, so a link never has two payable sessions). Anything else (paid,
 * expired, cancelled, processing, unknown) goes back to the platform's page, which says why. An open link
 * whose package was paid another way (a bank transfer, in part or in full) or cancelled is closed here
 * (cancelled, its session expired): never a second payment of the same package.
 */
@Injectable()
export class CheckoutService {
  private readonly log = new Logger(CheckoutService.name);

  constructor(
    private readonly deps: LinkDeps,
    private readonly clients: StripeClients,
    private readonly packages: LinkPackages,
  ) {}

  async target(token: string, now = new Date()): Promise<string> {
    const page = paymentLinkUrl(this.deps.views.payOrigin(), token);
    const link = await this.deps.links.byToken(token);
    if (!link || !link.subscription_id || link.processing) return page;
    if (effectiveLinkStatus({ status: statusOf(link), expires_at: link.expires_at }, now) !== 'open') return page;
    const stripe = await this.clients.client().catch(() => null);
    if (!stripe) return page; // keys missing or refused: the family sees the platform page, never a JSON error
    if (await this.packages.blocked(link.subscription_id)) return this.close({ stripe, link, now, page });
    if (link.stripe_session_id) {
      const current = await stripe.checkout.sessions.retrieve(link.stripe_session_id);
      if (current.status === 'open' && current.url) return current.url;
      if (current.status === 'complete') return page; // paid or pending: the webhook decides
    }
    return this.fresh({ stripe, link, now, page });
  }

  /** The package needs no payment any more: the link reads as cancelled from now on, its session cannot be paid. */
  private async close(c: { stripe: StripeApi; link: LinkRow; now: Date; page: string }): Promise<string> {
    await this.deps.links.cancel(c.link.id);
    if (c.link.stripe_session_id) await this.expire(c.stripe, c.link.stripe_session_id);
    return c.page;
  }

  private async fresh(c: { stripe: StripeApi; link: LinkRow; now: Date; page: string }): Promise<string> {
    const created = await c.stripe.checkout.sessions.create(checkoutParams(c.link, { payOrigin: this.deps.views.payOrigin(), now: c.now }));
    if (await this.deps.links.setSession({ id: c.link.id, prev: c.link.stripe_session_id, session: created.id })) return created.url ?? c.page;
    await this.expire(c.stripe, created.id); // lost the race: the winner's session is the link's
    const winner = (await this.deps.links.get(c.link.id))?.stripe_session_id;
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
