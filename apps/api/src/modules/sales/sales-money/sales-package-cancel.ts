import type { SalesMoneySubscriptionView, SubscriptionCancel as CancelBody } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { SubscriptionCancel } from '@/modules/finance/subscriptions';
import { toSalesSubscription } from './sales-money.mapper';
import { SalesMoneyScope } from './sales-money.scope';

/** Own student only while enforced; 404 then 403 before any write; the admin's rules apply. */
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
