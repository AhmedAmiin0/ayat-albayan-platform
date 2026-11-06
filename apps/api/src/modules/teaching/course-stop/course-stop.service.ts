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

/**
 * «إلغاء الاشتراك» from the student's profile (owner 2026-10-30): STOP THE COURSE, KEEP THE MONEY.
 * stop_course (migration 991) does it in ONE transaction: the course's rules (course_rules_of: also
 * a rule without subscription_id, imported or admin-booked, inside the package's period) end on the
 * stop day, its open lessons from now are cancelled (not chargeable), an open course pause closes,
 * the package becomes cancelled (kind 'stopped', who / when / why, the clientRequestId) and the
 * student «توقف» unless another package still runs. A stopped package stays in every money reader:
 * payments, held lessons, reports, earnings and the assistant's commission never change. A retry
 * with the same clientRequestId answers the first stop; 409 course_unattributed when a running rule
 * cannot be attributed (a group, or one running into the next package). No per-lesson notice.
 * Silent on purpose (owner 2026-10-30, «notify both» covers moves, cancels and pauses): no push or
 * template says «the course stopped» (course_paused says «مؤقتًا», lesson_cancelled names one
 * lesson); a course_stopped template and push kind wait for the owner's approval.
 * «إلغاء مع استرداد» (owner 2026-11-02, body.refund, subscriptions.refund): planned and checked
 * BEFORE the stop (403 refund_not_allowed / not_your_student: StopRefundGate; 409
 * refund_exceeds_allowed, 503 stripe_not_configured leave the package as it was), executed
 * after it (StopRefunds, idempotent on clientRequestId).
 */
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
      this.repo.paid(sub.id),
    ]);
    if (stopped === null && plan.unattributed) throw conflict('course_unattributed');
    const live = stopped === null;
    const subRef = { id: sub.id, studentId, currency: sub.currency };
    const [refund, owe] = await Promise.all([
      this.refunds.preview(input.user, subRef),
      this.refunds.owe(subRef),
    ]);
    return {
      subscriptionId: sub.id,
      futureLessons: live ? plan.lessons.length : 0,
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

  /** «إلغاء مع استرداد»: StopRefundGate's checks; the chosen amount at most the net paid. */
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
