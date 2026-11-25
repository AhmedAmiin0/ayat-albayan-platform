import {
  cancelBlock,
  type CancelBlock,
  type SubscriptionCancel as CancelBody,
  type SubscriptionView,
} from '@ab/money';
import { Injectable } from '@nestjs/common';
import { conflict } from '@/common/http/errors';
import { MoneyWrites } from '@/modules/finance/subscriptions/money/money-writes';
import { SubscriptionsService } from '@/modules/finance/subscriptions/shared/subscriptions.service';
import { SubscriptionCancelRepo } from './subscription-cancel.repo';

type CancelInput = CancelBody & { actorId: string; now?: Date };

/** Never deletes: 409 when payments, used lessons or a commission depend on it; audited. */
@Injectable()
export class SubscriptionCancel {
  constructor(
    private readonly subs: SubscriptionsService,
    private readonly queries: SubscriptionCancelRepo,
    private readonly writes: MoneyWrites,
  ) {}

  /** 404 subscription_not_found; the sales route checks the package's student before cancelling. */
  view(id: string): Promise<SubscriptionView> {
    return this.subs.get(id);
  }

  /** Why the package may not be cancelled (the 409 code), or null: the cancel's own check. */
  async block(before: SubscriptionView): Promise<CancelBlock | null> {
    const lessons = (await this.queries.linkedLessons(before.id)) + before.balance.lessons_used;
    const later = { id: before.id, studentId: before.student.id, createdAt: before.created_at };
    const laterCommission = before.price > 0 && (await this.queries.laterCommission(later));
    return cancelBlock({ status: before.status, paid: before.paid, lessons, laterCommission });
  }

  async cancel(before: SubscriptionView, input: CancelInput): Promise<SubscriptionView> {
    const block = await this.block(before);
    if (block) throw conflict(block);
    const write = { id: before.id, actorId: input.actorId, reason: input.reason ?? null, now: input.now ?? new Date() };
    const result = await this.queries.cancel(write);
    if (!result.row) throw conflict(result.block);
    const was = { status: before.status, price: before.price, paid: before.paid, lessons_total: before.lessons_total };
    const audit = { actorId: input.actorId, entity: 'subscriptions', entityId: before.id, action: 'cancel', before: was, after: result.row };
    await this.writes.done(audit, before.student.id);
    return this.subs.get(before.id);
  }
}
