import {
  DURATIONS,
  courseDaysPerWeek,
  wallParts,
  type Conflict,
  type CourseChangeCheck,
  type CourseChangeRequest,
  type CourseChangeResult,
} from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { startOfLocalDay } from '../scheduling/horizon';
import { domainError } from './booking.errors';
import { changePayload } from './course-change.payload';
import { assertChange, planChange, type ChangePlan, type ChangeRole } from './course-change.plan';
import { CourseChangeQueries, type ChangeRule, type CourseSub, type OpenCourseLesson } from './course-change.queries';
import { CourseChangeDeps } from './course-change.writer';
import { SalesBookingScope } from './sales-booking.ownership';
import { assertOwnStudents } from './sales-booking.scope';

export type ChangeActor = { user: AuthUser; role: ChangeRole };
type Loaded = { sub: CourseSub; active: ChangeRule[]; all: ChangeRule[] };
type Planned = Loaded & { plan: ChangePlan; counted: number; moved: (OpenCourseLesson & { rule_id: string | null })[] };

/**
 * «تغيير أيام الحلقات» (owner 2026-10-18, R-ASST-01/04): the course's lessons that have not happened
 * yet move to new days, the teacher, length and zone staying the course's. The assistant changes her
 * own student's course only and never over a clash; the admin may override with a reason. One
 * transaction (change_course): the old rules end the day before the change point, their open lessons
 * from it become rescheduled, the new rules carry exactly REMAINING lessons (course-change.plan.ts).
 */
@Injectable()
export class CourseChange {
  constructor(
    private readonly queries: CourseChangeQueries,
    private readonly scope: SalesBookingScope,
    private readonly deps: CourseChangeDeps,
  ) {}

  /** POST …/course/change/check: the clashes over the whole remaining course, nothing written. */
  async check(req: CourseChangeRequest, actor: ChangeActor): Promise<CourseChangeCheck> {
    const sub = await this.owned(req.subscriptionId, actor);
    const planned = await this.planned(req, actor, await this.load(sub));
    return { conflicts: await this.conflicts(planned), remaining: planned.plan.remaining, endsOn: planned.plan.endsOn };
  }

  /**
   * POST …/course/change: 201 CourseChangeResult (a retry with the same clientRequestId returns the
   * first change); 404 subscription_not_found / course_not_found, 403 not_your_student /
   * override_not_allowed, 409 course_finished / custom_count_admin / conflict (the assistant always,
   * the admin without override.reason), 400 date_in_past / days_count_mismatch / no_occurrences /
   * trial_not_course.
   */
  async change(req: CourseChangeRequest & { clientRequestId: string }, actor: ChangeActor): Promise<CourseChangeResult> {
    const sub = await this.owned(req.subscriptionId, actor);
    const replay = await this.deps.writer.replay(req.clientRequestId, sub.id);
    if (replay) return replay;
    const planned = await this.planned(req, actor, await this.load(sub));
    const conflicts = await this.conflicts(planned);
    if (conflicts.length > 0 && (actor.role === 'sales' || !req.override)) {
      throw domainError(HttpStatus.CONFLICT, 'conflict', { conflicts });
    }
    const payload = changePayload({
      req,
      actor: { id: actor.user.id, role: actor.role },
      subscriptionId: sub.id,
      active: planned.active,
      moved: planned.moved,
      plan: planned.plan,
      conflicts,
      ...(await this.messaging(planned.active)),
      counted: planned.counted,
    });
    return this.deps.writer.apply({ payload, subscriptionId: sub.id, moved: planned.moved.map((m) => m.id) });
  }

  /** 404 subscription_not_found; for the assistant 403 not_your_student unless the student is hers. */
  private async owned(subscriptionId: string, actor: ChangeActor): Promise<CourseSub> {
    const sub = await this.queries.subscription(subscriptionId);
    if (actor.role === 'sales') assertOwnStudents([sub.student_id], await this.scope.owned(actor.user));
    return sub;
  }

  /** The course's rules; 400 trial_not_course, 404 course_not_found, 409 course_finished (no active rule). */
  private async load(sub: CourseSub): Promise<Loaded> {
    if (sub.package === 'trial') throw domainError(HttpStatus.BAD_REQUEST, 'trial_not_course');
    const all = await this.queries.rules(sub.id);
    if (all.length === 0) throw domainError(HttpStatus.NOT_FOUND, 'course_not_found');
    const active = all.filter((r) => r.status === 'active');
    if (active.length === 0) throw domainError(HttpStatus.CONFLICT, 'course_finished');
    return { sub, active, all };
  }

  /** The guard, the lessons already used and the new plan. The change point is never before now. */
  private async planned(req: CourseChangeRequest, actor: ChangeActor, loaded: Loaded): Promise<Planned> {
    const { sub, active, all } = loaded;
    const tz = active[0]?.tz ?? 'Asia/Riyadh';
    const now = new Date();
    if (wallParts(req.startsAt, tz).date !== req.startsOn) throw domainError(HttpStatus.BAD_REQUEST, 'starts_at_mismatch');
    const durationMin = DURATIONS.find((d) => d === sub.duration);
    if (durationMin === undefined) throw new Error(`subscription ${sub.id} has duration ${sub.duration}`);
    const facts = { role: actor.role, perWeek: courseDaysPerWeek(sub), lessonsTotal: sub.lessons_total, durationMin, tz };
    assertChange(req, { ...facts, before: [] }, now);
    const cutoff = new Date(Math.max(startOfLocalDay(req.startsOn, tz).getTime(), now.getTime()));
    const ruleIds = all.map((r) => r.id);
    const before = await this.queries.before({ ruleIds, studentId: sub.student_id, cutoff });
    const horizonWeeks = await this.deps.settings.bookingHorizonWeeks();
    const plan = planChange({ req, facts: { ...facts, before }, now, horizonWeeks });
    const moved = await this.queries.openFrom(ruleIds, cutoff);
    return { ...loaded, plan, counted: sub.lessons_total - plan.remaining, moved };
  }

  /** Every new lesson against the teacher's and the student's time, the moved lessons and old rules excluded. */
  private conflicts(p: Planned): Promise<Conflict[]> {
    return this.deps.checker.check({
      teacherId: p.active[0]?.teacher_id ?? '',
      studentIds: [p.sub.student_id],
      proposed: p.plan.plans.flatMap((x) => x.occurrences),
      excludeIds: p.moved.map((m) => m.id),
      excludeRuleIds: p.active.map((r) => r.id),
    });
  }

  /** The confirmation's link and contacts: the course teacher's link, the guardians. */
  private async messaging(active: readonly ChangeRule[]) {
    const [head] = active;
    const teacherLink = head ? await this.queries.teacherLink(head.teacher_id) : null;
    const auto = (await this.deps.settings.all()).meeting_link_auto;
    const contacts = await this.queries.contacts(head ? head.schedule_rule_students.map((s) => s.student_id) : []);
    return { link: { teacherLink, auto }, contacts };
  }
}
