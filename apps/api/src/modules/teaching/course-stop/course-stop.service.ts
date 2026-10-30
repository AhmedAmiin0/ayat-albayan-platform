import {
  addDays,
  courseStopBlock,
  type CourseStopPreview,
  type CourseStopRequest,
  type CourseStopResult,
} from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { conflict } from '@/common/http/errors';
import { MoneyWrites } from '@/modules/finance/subscriptions';
import { LessonCancelService } from '@/modules/teaching/lessons';
import { CourseStopRepo, type StopSub } from './course-stop.repo';
import { toResult, toStopped } from './course-stop.mapper';
import { StopStudentRepo } from './stop-student.repo';

interface StopInput {
  studentId: string;
  body: CourseStopRequest;
  actor: AuthUser;
}

/**
 * «إلغاء الاشتراك» from the student's profile (owner 2026-10-30): STOP THE COURSE, KEEP THE MONEY.
 * Every active rule of the package's course ends on the cancel date with its open lessons from now
 * cancelled (LessonCancelService.stopRule: the same cancel path as the schedule's, one audited
 * transaction per rule), any other open lesson of the course still to come is cancelled too, the
 * package becomes cancelled (kind 'stopped', who / when / why) and the student «توقف». Payments,
 * held lessons, reports and earnings are never touched. Idempotent on clientRequestId; another stop
 * of a cancelled package is 409 already_cancelled.
 */
@Injectable()
export class CourseStop {
  constructor(
    private readonly repo: CourseStopRepo,
    private readonly cancels: LessonCancelService,
    private readonly student: StopStudentRepo,
    private readonly writes: MoneyWrites,
  ) {}

  /** subscriptionId absent: the student's current package (a sales file of a student not hers). */
  async preview(studentId: string, subscriptionId?: string): Promise<CourseStopPreview> {
    const sub = subscriptionId
      ? await this.repo.subscription(subscriptionId, studentId)
      : await this.repo.current(studentId);
    const now = new Date();
    const [rules, lessons, paid] = await Promise.all([
      this.repo.activeRules(sub.id, yesterday(now)),
      this.repo.futureLessons(sub.id, now),
      this.repo.paid(sub.id),
    ]);
    const stopped = toStopped(sub);
    const live = stopped === null;
    return {
      subscriptionId: sub.id,
      futureLessons: live ? lessons.length : 0,
      activeRules: live ? rules.length : 0,
      paid,
      currency: sub.currency,
      stopped,
    };
  }

  async stop({ studentId, body, actor }: StopInput): Promise<CourseStopResult> {
    const sub = await this.repo.subscription(body.subscriptionId, studentId);
    if (courseStopBlock(sub)) return this.replay(sub, body.clientRequestId);
    const now = new Date();
    const cancelled = await this.cancelCourse({ sub, reason: body.reason, actor, now });
    const row = await this.repo.stamp({ id: sub.id, actorId: actor.id, reason: body.reason, now });
    if (!row) return this.replay(sub, body.clientRequestId);
    const studentStatus = await this.student.churn({
      studentId,
      subscriptionId: sub.id,
      actorId: actor.id,
    });
    const after = {
      status: row.status,
      kind: 'stopped',
      reason: body.reason,
      client_request_id: body.clientRequestId,
      cancelled_lessons: cancelled.lessons,
      ended_rules: cancelled.rules,
      student_status: studentStatus,
    };
    const before = { status: sub.status, cancelled_at: null };
    const audit = {
      actorId: actor.id,
      entity: 'subscriptions',
      entityId: sub.id,
      action: 'cancel',
      before,
      after,
    };
    await this.writes.done(audit, studentId);
    return toResult({ sub: row, after });
  }

  /**
   * The rules end, then any open lesson of the course still to come (a rule paused or not active).
   */
  private async cancelCourse(input: { sub: StopSub; reason: string; actor: AuthUser; now: Date }) {
    const { sub, reason, actor, now } = input;
    const rules = await this.repo.activeRules(sub.id, yesterday(now));
    const lessons: string[] = [];
    for (const rule of rules)
      lessons.push(...(await this.cancels.stopRule({ ruleId: rule.id, at: now, reason, actor })));
    for (const lessonId of await this.repo.futureLessons(sub.id, now)) {
      const one = { scope: 'one' as const, by: 'admin' as const, reason };
      lessons.push(...(await this.cancels.cancel({ lessonId, body: one, actor })));
    }
    return { lessons, rules: rules.map((r) => r.id) };
  }

  /** The same request again answers its first stop; any other is 409 already_cancelled. */
  private async replay(sub: StopSub, requestId: string): Promise<CourseStopResult> {
    const after = await this.repo.replay(sub.id, requestId);
    if (!after) throw conflict('already_cancelled');
    return toResult({ sub, after });
  }
}

/**
 * The day before today in UTC: no zone's today is earlier (the rule's own zone is applied per
 * rule).
 */
const yesterday = (now: Date): string => addDays(now.toISOString().slice(0, 10), -1);
