import {
  riyadhToday,
  usedBeforeEditProblem,
  usedBeforeState,
  type SubscriptionView,
  type UsedBeforeEditInput as Facts,
  type UsedBeforeState,
  type UsedBeforeEditProblem,
  type UsedBeforeEditResult,
} from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { badRequest, conflict, notFound } from '@/common/http/errors';
import { MoneyWrites } from '@/modules/finance/subscriptions/money/money-writes';
import { SubscriptionsRepo } from '@/modules/finance/subscriptions/shared/subscriptions.repo';
import { SubscriptionsService } from '@/modules/finance/subscriptions/shared/subscriptions.service';
import { UsedBeforeEditRepo } from './used-before-edit.repo';

type HttpError = (code: string) => Error;

const ERRORS: Record<UsedBeforeEditProblem, HttpError> = {
  already_cancelled: conflict,
  used_before_course_booked: conflict,
  used_before_needs_past_start: badRequest,
  used_before_too_many: badRequest,
};

interface UsedBeforeEditInput {
  id: string;
  lessonsUsedBefore: number;
  actorId: string;
  now: Date;
}

const resultOf = (view: SubscriptionView): UsedBeforeEditResult => ({
  subscription_id: view.id,
  lessons_total: view.lessons_total,
  lessons_used_before: view.lessons_used_before ?? 0,
  lessons_used: view.balance.lessons_used,
  remaining: view.balance.remaining,
});

/** The course check and the write are two statements: an accepted narrow race. */
@Injectable()
export class UsedBeforeEdit {
  constructor(
    private readonly subs: SubscriptionsService,
    private readonly rows: SubscriptionsRepo,
    private readonly repo: UsedBeforeEditRepo,
    private readonly writes: MoneyWrites,
  ) {}

  /** GET: what the editor may offer (the stored number, the max, an outright refusal). */
  async state(id: string, now = new Date()): Promise<UsedBeforeState> {
    const view = await this.subs.get(id);
    const facts = await this.factsOf(view, now);
    return usedBeforeState({ ...facts, id: view.id, current: view.lessons_used_before ?? 0 });
  }

  async edit(input: UsedBeforeEditInput): Promise<UsedBeforeEditResult> {
    const view = await this.subs.get(input.id);
    const from = view.lessons_used_before ?? 0;
    const facts = await this.factsOf(view, input.now);
    const problem = usedBeforeEditProblem({ ...facts, next: input.lessonsUsedBefore });
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

  private async factsOf(view: SubscriptionView, now: Date): Promise<Omit<Facts, 'next'>> {
    return {
      lessonsTotal: view.lessons_total,
      platformUsed: view.balance.lessons_used - (view.lessons_used_before ?? 0),
      cancelled: view.status === 'cancelled',
      courseBooked: await this.repo.courseBooked(view.id),
      pastStart: view.starts_on < riyadhToday(now),
    };
  }
}
