import type { PaymentLinkView } from '@ab/shared';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import type Stripe from 'stripe';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { conflict, notFound } from '../../../../common/http/errors';
import { StripeClients, type StripeApi } from '../gate/stripe-clients';
import { LinkDeps } from './link-deps';
import { LinkPackages } from './link-packages';

type Found = { api: StripeApi; id: string; status: Stripe.Checkout.Session['status'] };

/**
 * «إلغاء الرابط» of an open link (hers; an admin any). Stripe is asked about the link's session first: when it
 * cannot say, nothing changes (502 stripe_unavailable, she tries again). Then the link (so the payment page
 * refuses at once), its open Checkout Session expired and its still-unpaid package cancelled with the admin's
 * rules (LinkPackages). A payment already under way never loses its package: a processing link is refused
 * (409 link_processing), and the package stays when the session completed (the webhook records the payment),
 * could not be expired, or was replaced by a racing checkout.
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
    const found = link.stripe_session_id ? await this.session(link.stripe_session_id) : null;
    const row = await this.deps.links.cancel(id);
    if (!row) throw conflict('link_not_open');
    await this.deps.audit.record({ actorId: user.id, entity: 'payment_links', entityId: id, action: 'cancel' });
    const same = row.stripe_session_id === link.stripe_session_id;
    if (row.subscription_id && same && (await this.closed(found))) await this.packages.release(row.subscription_id, user.id);
    return this.deps.views.one(row);
  }

  /** Stripe's word on the session before anything changes (503 when the keys are missing or live). */
  private async session(id: string): Promise<Found> {
    const api = await this.clients.client();
    try {
      return { api, id, status: (await api.checkout.sessions.retrieve(id)).status };
    } catch (e) {
      this.log.warn(`payment link session not read, link kept open: ${e instanceof Error ? e.message : String(e)}`);
      throw new HttpException({ code: 'stripe_unavailable', message: 'stripe_unavailable' }, HttpStatus.BAD_GATEWAY);
    }
  }

  /** true once the session can no longer be paid: none, expired before, or expired now. */
  private async closed(found: Found | null): Promise<boolean> {
    if (!found || found.status === 'expired') return true;
    if (found.status !== 'open') return false; // complete: the webhook records the payment on the package
    try {
      await found.api.checkout.sessions.expire(found.id);
      return true;
    } catch (e) {
      this.log.warn(`payment link session not expired, package kept: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }
}
