import { fromMinorUnits } from '@ab/shared';
import { HttpException, Injectable, Logger } from '@nestjs/common';
import type Stripe from 'stripe';
import { conflict, errorCode } from '../../../../common/http/errors';
import { ar } from '../../../../common/i18n/server-text';
import { PaymentsQueries } from '../../payments';
import { uuidFor } from '../links/link-ids';
import { LinkPackages } from '../links/link-packages';
import type { LinkRow } from '../links/payment-links.queries';
import { WebhookDeps } from './webhook-deps';

export const idOf = (v: string | { id: string } | null): string | null => (typeof v === 'string' ? v : (v?.id ?? null));
/** paid_at: when Stripe says it happened, never in the future. */
export const pastIso = (unixSeconds: number, now = new Date()): string => new Date(Math.min(unixSeconds * 1000, now.getTime())).toISOString();

/**
 * A paid Checkout Session → ONE payment on the link's package through the normal PaymentsService (method
 * card, the session's amount_total, client_request_id = a uuid of the session id, recorded_by = the link's
 * assistant), so the recompute makes the package active and the commission triggers credit her. On a NEW
 * subscription of a student nobody brought and without a priced package, the student is first attributed to
 * her (brought_at = the link's creation) so the first-package commission applies; otherwise attribution is
 * never changed (a renewal follows the renewal commission rules of whoever brought the student). A payment the platform refuses (e.g. a
 * cancelled package, or one paid another way while this session stayed open) is not retried: the admins get a bell row to settle it by hand.
 */
@Injectable()
export class LinkFulfilment {
  private readonly log = new Logger(LinkFulfilment.name);

  constructor(
    private readonly deps: WebhookDeps,
    private readonly packages: LinkPackages,
    private readonly recorded: PaymentsQueries,
  ) {}

  linkOf(session: Pick<Stripe.Checkout.Session, 'client_reference_id' | 'metadata'>): Promise<LinkRow | null> {
    const id = session.client_reference_id ?? session.metadata?.payment_link_id ?? null;
    return id && /^[0-9a-f-]{36}$/.test(id) ? this.deps.links.get(id) : Promise.resolve(null);
  }

  async paid(session: Stripe.Checkout.Session, eventAt: number): Promise<string> {
    const link = await this.linkOf(session);
    if (!link?.subscription_id) return this.orphan(session, link);
    const amount = fromMinorUnits(session.amount_total ?? 0);
    const currency = (session.currency ?? link.currency).toUpperCase();
    let payment;
    try {
      await this.stillPayable(link.subscription_id, session.id);
      await this.attribute(link);
      payment = await this.deps.payments.create(
        { subscriptionId: link.subscription_id, amount, currency, kind: 'payment', method: 'card', paidAt: pastIso(eventAt), note: `Stripe ${session.id}`, clientRequestId: uuidFor(session.id) },
        link.created_by,
      );
    } catch (e) {
      if (!(e instanceof HttpException) || e.getStatus() >= 500) throw e;
      const title = ar.paymentLinks.bell.refusedTitle;
      await this.deps.alerts.admins({ subject: `payment_link_refused:${session.id}`, title, text: `${amount} ${currency} (${errorCode(e) ?? 'refused'})`, link });
      return `refused:${errorCode(e) ?? e.getStatus()}`;
    }
    await this.deps.links.markPaid(link.id, { paymentId: payment.id, paidAt: payment.paid_at, paymentIntent: idOf(session.payment_intent) });
    await this.deps.alerts.paid(link, { amount, currency });
    return 'paid';
  }

  /** async_payment_failed: the session is dropped so the family can try again with a new one. */
  async failed(session: Stripe.Checkout.Session): Promise<string> {
    const link = await this.linkOf(session);
    if (!link) return 'unknown_link';
    await this.deps.links.setProcessing(link.id, false);
    await this.deps.links.setSession({ id: link.id, prev: session.id, session: null });
    return 'async_failed';
  }

  /** completed with an asynchronous method still pending: nothing is recorded until it succeeds. */
  async pending(session: Stripe.Checkout.Session): Promise<string> {
    const link = await this.linkOf(session);
    if (link) await this.deps.links.setProcessing(link.id, true);
    return link ? 'pending' : 'unknown_link';
  }

  /**
   * 409 already_paid / subscription_cancelled: the package was paid another way (a bank transfer) or cancelled
   * while this session stayed open (up to 23 h). Only this session's own retry (its payment already recorded,
   * the event not yet done) goes on, to replay it.
   */
  private async stillPayable(subscriptionId: string, sessionId: string): Promise<void> {
    const blocked = await this.packages.blocked(subscriptionId);
    if (blocked && !(await this.recorded.byRequest(uuidFor(sessionId)))) throw conflict(blocked);
  }

  /** Our session (client_reference_id) but no link or no package any more: Stripe has the money, so the admins are told. */
  private async orphan(session: Stripe.Checkout.Session, link: LinkRow | null): Promise<string> {
    if (!link && !session.client_reference_id && !session.metadata?.payment_link_id) return 'not_ours';
    const text = `${fromMinorUnits(session.amount_total ?? 0)} ${(session.currency ?? '').toUpperCase()} (${session.id})`;
    await this.deps.alerts.admins({ subject: `payment_link_orphan:${session.id}`, title: ar.paymentLinks.bell.refusedTitle, text, link });
    return 'orphan_alerted';
  }

  /** Only a NEW subscription of a student nobody brought and who never had a priced package (never a takeover). */
  private async attribute(link: LinkRow): Promise<void> {
    if (link.kind !== 'new') return;
    try {
      const student = await this.deps.links.student(link.student_id);
      if (student && student.broughtBy === null && student.priced.every((id) => id === link.subscription_id)) {
        await this.deps.links.attribute({ studentId: link.student_id, assistantId: link.created_by, broughtAt: link.created_at });
      }
    } catch (e) {
      this.log.warn(`payment link attribution skipped: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
