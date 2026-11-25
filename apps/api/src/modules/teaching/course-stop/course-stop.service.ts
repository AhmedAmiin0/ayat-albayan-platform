import type { CourseStopPreview, CourseStopRequest, CourseStopResult } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { LessonEvents } from '@/common/infra/events/lesson-events';
import { conflict } from '@/common/http/errors';
import { MoneyWrites } from '@/modules/finance/subscriptions';
import { CourseStopRepo } from './course-stop.repo';
import { storedOwed, toResult, toStopped } from './course-stop.mapper';
import { StopRefundGate, type OwedDecision, type RefundSub } from './refund';

interface PreviewInput {
  studentId: string;
  /** Absent: the student's current package (a sales file of a student not hers). */
  subscriptionId?: string | undefined;
  user: AuthUser;
}

interface StopInput {
  studentId: string;
  body: CourseStopRequest;
  actor: AuthUser;
}

/** Stops the course but keeps the money, in one transaction (migration 991); silent on purpose. */
@Injectable()
export class CourseStop {
  constructor(
    private readonly repo: CourseStopRepo,
    private readonly writes: MoneyWrites,
    private readonly events: LessonEvents,
    private readonly refunds: StopRefundGate,
  ) {}

  /** The sheet's lines; `refund` only for a holder of subscriptions.refund. */
  async preview(input: PreviewInput): Promise<CourseStopPreview> {
    const { studentId, subscriptionId } = input;
    const sub = subscriptionId
      ? await this.repo.subscription(subscriptionId, studentId)
      : await this.repo.current(studentId);
    const stopped = toStopped(sub);
    const [plan, paid] = await Promise.all([
      this.repo.plan(sub.id, new Date()),
      this.repo.paid(sub),
    ]);
    if (stopped === null && plan.unattributed) throw conflict('course_unattributed');
    const live = stopped === null;
    const subRef = { id: sub.id, studentId, currency: sub.currency };
    const [refund, owe, starts] = await Promise.all([
      this.refunds.preview(input.user, subRef),
      this.refunds.owe(subRef),
      this.repo.starts(plan.lessons.map((l) => l.id)),
    ]);
    return {
      subscriptionId: sub.id,
      futureLessons: live ? plan.lessons.length : 0,
      futureStarts: starts,
      activeRules: live ? plan.rule_ids.length : 0,
      paid,
      currency: sub.currency,
      refund: refund.refund,
      refundUnavailable: refund.unavailable,
      owe,
      stopped,
    };
  }

  async stop({ studentId, body, actor }: StopInput): Promise<CourseStopResult> {
    const sub = await this.repo.subscription(body.subscriptionId, studentId);
    const ref = { id: sub.id, studentId, currency: sub.currency };
    const stored = storedOwed(sub, body.clientRequestId);
    const plan = body.refund ? await this.refundPlan({ ref, body, actor, stored }) : null;
    const owe = { sub: ref, ask: body.owe, stored };
    const owed = plan?.owed ?? (await this.refunds.decide(actor, owe));
    const row = await this.repo.stop({
      subscriptionId: body.subscriptionId,
      studentId,
      requestId: body.clientRequestId,
      actorId: actor.id,
      reason: body.reason,
      owed,
    });
    // Again on a replay (all idempotent): a crash after the commit never loses the follow-ups.
    await this.events.changed(row.cancelled_lessons);
    const entry = { actorId: actor.id, entity: 'subscriptions', entityId: body.subscriptionId };
    await this.writes.recorded({ ...entry, action: 'cancel' }, studentId);
    const reason = body.reason;
    const refund = plan
      ? await this.refunds.execute({ plan, actor: { id: actor.id, reason } })
      : null;
    return toResult(body.subscriptionId, row, refund);
  }

  /** Refund checks; the chosen amount is at most the net paid. */
  private refundPlan(input: {
    ref: RefundSub;
    body: CourseStopRequest;
    actor: AuthUser;
    stored: OwedDecision | null;
  }) {
    const { ref, body, actor, stored } = input;
    const ask = body.refund ?? { choice: 'unattended' as const };
    return this.refunds.plan(actor, { sub: ref, requestId: body.clientRequestId, ask, stored });
  }
}
