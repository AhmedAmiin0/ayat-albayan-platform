import type { CourseStopPreview, CourseStopRequest, CourseStopResult } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { LessonEvents } from '@/common/events/lesson-events';
import { conflict } from '@/common/http/errors';
import { MoneyWrites } from '@/modules/finance/subscriptions';
import { CourseStopRepo } from './course-stop.repo';
import { toResult, toStopped } from './course-stop.mapper';

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
 */
@Injectable()
export class CourseStop {
  constructor(
    private readonly repo: CourseStopRepo,
    private readonly writes: MoneyWrites,
    private readonly events: LessonEvents,
  ) {}

  /** subscriptionId absent: the student's current package (a sales file of a student not hers). */
  async preview(studentId: string, subscriptionId?: string): Promise<CourseStopPreview> {
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
    return {
      subscriptionId: sub.id,
      futureLessons: live ? plan.lessons.length : 0,
      activeRules: live ? plan.rule_ids.length : 0,
      paid,
      currency: sub.currency,
      stopped,
    };
  }

  async stop({ studentId, body, actor }: StopInput): Promise<CourseStopResult> {
    const row = await this.repo.stop({
      subscriptionId: body.subscriptionId,
      studentId,
      requestId: body.clientRequestId,
      actorId: actor.id,
      reason: body.reason,
    });
    // Again on a replay (all idempotent): a crash after the commit never loses the follow-ups.
    await this.events.changed(row.cancelled_lessons);
    const entry = { actorId: actor.id, entity: 'subscriptions', entityId: body.subscriptionId };
    await this.writes.recorded({ ...entry, action: 'cancel' }, studentId);
    return toResult(body.subscriptionId, row);
  }
}
