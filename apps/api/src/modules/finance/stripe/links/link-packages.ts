import { effectiveLinkStatus } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionCancel } from '../../subscriptions';
import { statusOf } from './payment-links.mapper';
import { PaymentLinksQueries } from './payment-links.queries';

/**
 * The unpaid package of a link nobody will pay (cancelled, or expired) is cancelled with the admin's rules
 * (SubscriptionCancel: nothing paid, no lesson), so it is never owed and never makes the student's next
 * package read as a renewal (subscription_commission_kind orders by creation). A failure is logged.
 */
@Injectable()
export class LinkPackages {
  private readonly log = new Logger(LinkPackages.name);

  constructor(
    private readonly links: PaymentLinksQueries,
    private readonly cancels: SubscriptionCancel,
  ) {}

  async release(subscriptionId: string, actorId: string): Promise<void> {
    try {
      const before = await this.cancels.view(subscriptionId);
      if (before.status !== 'cancelled' && before.paid === 0) await this.cancels.cancel(before, { actorId, reason: 'payment_link_unused' });
    } catch (e) {
      this.log.warn(`payment link package not cancelled: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /**
   * Why the link's package can no longer take the link's amount, or null when it can: cancelled («إلغاء
   * الباقة»), or something already paid on it (a bank transfer recorded meanwhile, in part or in full, means
   * the link would be paid twice).
   */
  async blocked(subscriptionId: string): Promise<'subscription_cancelled' | 'already_paid' | null> {
    const sub = await this.cancels.view(subscriptionId);
    if (sub.status === 'cancelled') return 'subscription_cancelled';
    return sub.paid > 0 ? 'already_paid' : null;
  }

  /** Before a new link: the packages of the student's earlier links that can no longer be paid. */
  async releaseStale(studentId: string, actorId: string, now = new Date()): Promise<void> {
    for (const link of await this.links.forStudent(studentId)) {
      const status = effectiveLinkStatus({ status: statusOf(link), expires_at: link.expires_at }, now);
      if ((status === 'expired' || status === 'cancelled') && link.subscription_id && !link.paid_payment_id && !link.processing)
        await this.release(link.subscription_id, actorId);
    }
  }
}
