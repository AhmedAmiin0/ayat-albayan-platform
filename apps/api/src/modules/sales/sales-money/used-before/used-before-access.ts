import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { SubscriptionsService } from '@/modules/finance/subscriptions';
import { SalesMoneyScope } from '@/modules/sales/sales-money/shared';
import { isSales } from '@/common/auth/roles';

/** Any student's package unless the assignment rule is enforced (403 not_your_student). */
@Injectable()
export class UsedBeforeAccess {
  constructor(
    private readonly subs: SubscriptionsService,
    private readonly scope: SalesMoneyScope,
  ) {}

  async assert(id: string, user: AuthUser): Promise<void> {
    if (!isSales(user)) return;
    const view = await this.subs.get(id);
    await this.scope.assertOwns(user, view.student.id);
  }
}
