import type {
  SalesPackageCancelCheck,
  SalesPackageCancelled,
  SubscriptionCancel as CancelBody,
} from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { SubscriptionCancel } from '@/modules/finance/subscriptions';

/**
 * «إلغاء الباقة» by the assistant (owner 2026-11-02): ANY student's package (no ownership
 * check, as «إلغاء الاشتراك»). The check, the write, the 409s (already_cancelled / has_payments /
 * has_lessons / has_commission), the audit and the recompute are the admin's (SubscriptionCancel);
 * the answer is the id and the status only: maybe not her student, so never a price or payment.
 */
@Injectable()
export class AnyPackageCancel {
  constructor(private readonly cancels: SubscriptionCancel) {}

  /** 404 subscription_not_found; else what the POST would refuse (null: it may). */
  async check(id: string): Promise<SalesPackageCancelCheck> {
    const before = await this.cancels.view(id);
    return { subscriptionId: before.id, block: await this.cancels.block(before) };
  }

  async cancel(id: string, input: CancelBody, user: AuthUser): Promise<SalesPackageCancelled> {
    const before = await this.cancels.view(id);
    const after = await this.cancels.cancel(before, { ...input, actorId: user.id });
    return { id: after.id, status: 'cancelled' };
  }
}
