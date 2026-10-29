import type { PaymentLinkView } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { conflict, notFound } from '../../../../common/http/errors';
import { StripeClients } from '../gate/stripe-clients';
import { LinkDeps } from './link-deps';
import { LinkPackages } from './link-packages';

/**
 * «إلغاء الرابط» of an open link (hers; an admin any): the link first (so the payment page refuses at once),
 * then, best effort, its open Checkout Session is expired and its still-unpaid package cancelled with the
 * admin's rules (LinkPackages). A failure there is logged, never undone. A payment already under way never
 * loses its package: a processing link is refused (409 link_processing), and the package stays when the
 * session completed (the webhook records the payment) or Stripe could not say.
 */
@Injectable()
export class LinkCancel {
  private readonly log = new Logger(LinkCancel.name);

  constructor(
    private readonly deps: LinkDeps,
    private readonly packages: LinkPackages,
    private readonly clients: StripeClients,
  ) {}

  async cancel(id: string, user: AuthUser): Promise<PaymentLinkView> {
    const link = await this.deps.links.get(id);
    if (!link || (user.role !== 'admin' && link.created_by !== user.id)) throw notFound('link_not_found');
    if (link.processing) throw conflict('link_processing');
    const row = await this.deps.links.cancel(id);
    if (!row) throw conflict('link_not_open');
    await this.deps.audit.record({ actorId: user.id, entity: 'payment_links', entityId: id, action: 'cancel' });
    const unpayable = !row.stripe_session_id || (await this.closeSession(row.stripe_session_id));
    if (row.subscription_id && unpayable) await this.packages.release(row.subscription_id, user.id);
    return this.deps.views.one(row);
  }

  /** true once the session can no longer be paid (expired now or before); false when it completed or Stripe could not say. */
  private async closeSession(sessionId: string): Promise<boolean> {
    try {
      const stripe = await this.clients.client();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.status === 'open') await stripe.checkout.sessions.expire(sessionId);
      return session.status !== 'complete';
    } catch (e) {
      this.log.warn(`payment link session not closed, package kept: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }
}
