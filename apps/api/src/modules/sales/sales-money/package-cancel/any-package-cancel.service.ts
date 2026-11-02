import type {
  SalesPackageCancelCheck,
  SalesPackageCancelled,
  SubscriptionCancel as CancelBody,
  SubscriptionView,
} from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { SubscriptionCancel } from '@/modules/finance/subscriptions';
import { SalesMoneyScope } from '@/modules/sales/sales-money/sales-money.scope';

/** Who the assistant ownership rule binds: the sales base role; the admin never. */
const isAssistant = (user: AuthUser): boolean => user.role === 'sales';

/**
 * «إلغاء الباقة» by the assistant (owner 2026-11-02): ANY student's package while «اشتراط التعيين»
 * is OFF (the default), only hers while SalesOwnershipRule enforces it (403 not_your_student).
 * The check, the write, the 409s (already_cancelled / has_payments / has_lessons /
 * has_commission), the audit and the recompute are the admin's (SubscriptionCancel); the answer is
 * the id and the status only: maybe not her student, so never a price or payment.
 */
@Injectable()
export class AnyPackageCancel {
  constructor(
    private readonly cancels: SubscriptionCancel,
    private readonly scope: SalesMoneyScope,
  ) {}

  /** 404 subscription_not_found; else what the POST would refuse (null: it may). */
  async check(id: string, user: AuthUser): Promise<SalesPackageCancelCheck> {
    const before = await this.allowed(id, user);
    return { subscriptionId: before.id, block: await this.cancels.block(before) };
  }

  async cancel(id: string, input: CancelBody, user: AuthUser): Promise<SalesPackageCancelled> {
    const before = await this.allowed(id, user);
    const after = await this.cancels.cancel(before, { ...input, actorId: user.id });
    return { id: after.id, status: 'cancelled' };
  }

  /** The package (404), then the ownership rule for an assistant (403) before anything is read. */
  private async allowed(id: string, user: AuthUser): Promise<SubscriptionView> {
    const before = await this.cancels.view(id);
    if (isAssistant(user)) await this.scope.assertOwns(user, before.student.id);
    return before;
  }
}
