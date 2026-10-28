import { cancelBlock, type SubscriptionCancel as CancelBody, type SubscriptionView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { conflict } from '../../../../common/http/errors';
import { MoneyWrites } from '../money/money-writes';
import { SubscriptionsService } from '../subscriptions.service';
import { SubscriptionCancelQueries } from './subscription-cancel.queries';

type CancelInput = CancelBody & { actorId: string; now?: Date };

/**
 * «إلغاء الباقة» (owner 2026-10-28: «close it or cancel it»; never delete data). Only a package nothing
 * hangs on: 409 already_cancelled, has_payments (net paid ≠ 0), has_lessons (a lesson not cancelled on
 * a rule of its course, or a lesson it used FIFO: admin bookings, makeups and imported rules carry no
 * subscription_id) or has_commission (a later package earned its commission as a renewal because of it).
 * Future lessons merely projected into it do not block: they move to the next package. The row stays («ملغاة») with who / when / why; audited through MoneyWrites, which
 * closes its open tasks and recomputes the student (a cancelled package is skipped there: never resurrected).
 */
@Injectable()
export class SubscriptionCancel {
  constructor(
    private readonly subs: SubscriptionsService,
    private readonly queries: SubscriptionCancelQueries,
    private readonly writes: MoneyWrites,
  ) {}

  /** 404 subscription_not_found; the sales route checks the package's student before cancelling. */
  view(id: string): Promise<SubscriptionView> {
    return this.subs.get(id);
  }

  async cancel(before: SubscriptionView, input: CancelInput): Promise<SubscriptionView> {
    const lessons = (await this.queries.linkedLessons(before.id)) + before.balance.lessons_used;
    const later = { id: before.id, studentId: before.student.id, createdAt: before.created_at };
    const laterCommission = before.price > 0 && (await this.queries.laterCommission(later));
    const block = cancelBlock({ status: before.status, paid: before.paid, lessons, laterCommission });
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
