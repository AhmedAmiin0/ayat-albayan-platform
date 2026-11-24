import {
  riyadhToday,
  startDateEditProblem,
  type StartDateEditProblem,
  type StartDateEditResult,
  type SubscriptionView,
} from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { badRequest, conflict, notFound } from '@/common/http/errors';
import { MoneyWrites } from '@/modules/finance/subscriptions/money/money-writes';
import {
  SubscriptionsRepo,
  type SubRow,
} from '@/modules/finance/subscriptions/shared/subscriptions.repo';
import { SubscriptionsService } from '@/modules/finance/subscriptions/shared/subscriptions.service';
import { StartDateEditRepo } from './start-date-edit.repo';

type HttpError = (code: string) => Error;

const ERRORS: Record<StartDateEditProblem, HttpError> = {
  already_cancelled: conflict,
  start_date_too_old: badRequest,
  used_before_needs_past_start: badRequest,
};

interface StartDateEditInput {
  id: string;
  /** YYYY-MM-DD. */
  startsOn: string;
  actorId: string;
  now: Date;
}

const resultOf = (id: string, startsOn: string): StartDateEditResult => ({
  subscription_id: id,
  starts_on: startsOn,
});

/** The audit row: the package before / after, by whom (the used-before edit's shape). */
const auditOf = (actorId: string, rows: { before: SubRow; after: SubRow }) => ({
  actorId,
  entity: 'subscriptions',
  entityId: rows.after.id,
  action: 'update',
  ...rows,
});

/** Throws the refusal of startDateEditProblem (today = Asia/Riyadh), if any. */
function assertAllowed(view: SubscriptionView, input: StartDateEditInput): void {
  const problem = startDateEditProblem({
    next: input.startsOn,
    today: riyadhToday(input.now),
    cancelled: view.status === 'cancelled',
    lessonsUsedBefore: view.lessons_used_before ?? 0,
  });
  if (problem) throw ERRORS[problem](problem);
}

/** Only starts_on is written; recompute follows since the balance FIFO follows starts_on. */
@Injectable()
export class StartDateEdit {
  constructor(
    private readonly subs: SubscriptionsService,
    private readonly rows: SubscriptionsRepo,
    private readonly repo: StartDateEditRepo,
    private readonly writes: MoneyWrites,
  ) {}

  async edit(input: StartDateEditInput): Promise<StartDateEditResult> {
    const view = await this.subs.get(input.id);
    assertAllowed(view, input);
    if (view.starts_on === input.startsOn) return resultOf(view.id, view.starts_on);
    const before = await this.rows.get(view.id);
    if (!before) throw notFound('subscription_not_found');
    const write = { id: view.id, from: before.starts_on, to: input.startsOn };
    const after = await this.repo.setStartsOn(write);
    if (!after) throw conflict('start_date_changed');
    await this.writes.done(auditOf(input.actorId, { before, after }), view.student.id);
    return resultOf(after.id, after.starts_on);
  }
}
