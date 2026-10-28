import type { SalesMoneySubscriptionView, SubscriptionCancel as CancelBody } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../common/auth/verify-token';
import { SubscriptionCancel } from '../../finance/subscriptions';
import { toSalesSubscription } from './sales-money.mapper';
import { SalesMoneyScope } from './sales-money.scope';

/**
 * «إلغاء الباقة» by the salesperson (owner 2026-10-28): a package of HER student only (the ownership of
 * «الاشتراكات», SalesMoneyScope): 404 subscription_not_found, then 403 not_your_student before anything is
 * written. The rules and the write are the admin's (SubscriptionCancel: 409 has_payments / has_lessons /
 * already_cancelled, audit, recompute); the answer is her whitelisted view.
 */
@Injectable()
export class SalesPackageCancel {
  constructor(
    private readonly scope: SalesMoneyScope,
    private readonly cancels: SubscriptionCancel,
  ) {}

  async cancel(id: string, input: CancelBody, user: AuthUser): Promise<SalesMoneySubscriptionView> {
    const before = await this.cancels.view(id);
    await this.scope.assertOwns(user, before.student.id);
    return toSalesSubscription(await this.cancels.cancel(before, { ...input, actorId: user.id }));
  }
}
