import {
  usedBeforeEditProblem,
  type SubscriptionView,
  type UsedBeforeEditProblem,
  type UsedBeforeEditResult,
} from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { badRequest, conflict, notFound } from '@/common/http/errors';
import { MoneyWrites } from '@/modules/finance/subscriptions/money/money-writes';
import { SubscriptionsRepo } from '@/modules/finance/subscriptions/subscriptions.repo';
import { SubscriptionsService } from '@/modules/finance/subscriptions/subscriptions.service';
import { UsedBeforeEditRepo } from './used-before-edit.repo';

type HttpError = (code: string) => Error;

const ERRORS: Record<UsedBeforeEditProblem, HttpError> = {
  already_cancelled: conflict,
  used_before_course_booked: conflict,
  used_before_too_many: badRequest,
};

export interface UsedBeforeEditInput {
  id: string;
  lessonsUsedBefore: number;
  actorId: string;
}

const resultOf = (view: SubscriptionView): UsedBeforeEditResult => ({
  subscription_id: view.id,
  lessons_total: view.lessons_total,
  lessons_used_before: view.lessons_used_before ?? 0,
  lessons_used: view.balance.lessons_used,
  remaining: view.balance.remaining,
});

/**
 * «تعديل عدد الحلقات المستخدمة» (owner 2026-11-02): admins and assistants, ANY student (the sales
 * ownership rule of «sales_require_assignee», off by default: no owner check). Refusals:
 * usedBeforeEditProblem (404 subscription_not_found, 409 already_cancelled /
 * used_before_course_booked / used_before_changed, 400 used_before_too_many). Audited with
 * the row before / after through MoneyWrites, which recomputes the student's statuses and
 * alerts from the new balance.
 */
@Injectable()
export class UsedBeforeEdit {
  constructor(
    private readonly subs: SubscriptionsService,
    private readonly rows: SubscriptionsRepo,
    private readonly repo: UsedBeforeEditRepo,
    private readonly writes: MoneyWrites,
  ) {}

  async edit(input: UsedBeforeEditInput): Promise<UsedBeforeEditResult> {
    const view = await this.subs.get(input.id);
    const from = view.lessons_used_before ?? 0;
    const problem = usedBeforeEditProblem({
      next: input.lessonsUsedBefore,
      lessonsTotal: view.lessons_total,
      platformUsed: view.balance.lessons_used - from,
      cancelled: view.status === 'cancelled',
      courseBooked: await this.repo.courseBooked(view.id),
    });
    if (problem) throw ERRORS[problem](problem);
    if (from === input.lessonsUsedBefore) return resultOf(view);
    const before = await this.rows.get(view.id);
    if (!before) throw notFound('subscription_not_found');
    const after = await this.repo.setUsedBefore({ id: view.id, from, to: input.lessonsUsedBefore });
    if (!after) throw conflict('used_before_changed');
    const audit = {
      actorId: input.actorId,
      entity: 'subscriptions',
      entityId: view.id,
      action: 'update',
      before,
      after,
    };
    await this.writes.done(audit, view.student.id);
    return resultOf(await this.subs.get(view.id));
  }
}
