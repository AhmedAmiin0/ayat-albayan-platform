import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { SubscriptionsService } from '@/modules/finance/subscriptions';
import { SalesMoneyScope } from '@/modules/sales/sales-money/sales-money.scope';

/** Who the assistant ownership rule binds: the sales base role; the admin never. */
const isAssistant = (user: AuthUser): boolean => user.role === 'sales';

/**
 * «تعديل عدد الحلقات المستخدمة» by an assistant (owner 2026-11-02): ANY student's package while
 * «اشتراط التعيين» is OFF (the default), only hers while SalesOwnershipRule enforces it
 * (403 not_your_student), checked before anything else is read. 404 subscription_not_found.
 */
@Injectable()
export class UsedBeforeAccess {
  constructor(
    private readonly subs: SubscriptionsService,
    private readonly scope: SalesMoneyScope,
  ) {}

  async assert(id: string, user: AuthUser): Promise<void> {
    if (!isAssistant(user)) return;
    const view = await this.subs.get(id);
    await this.scope.assertOwns(user, view.student.id);
  }
}
