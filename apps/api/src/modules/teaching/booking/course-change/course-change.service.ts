import {
  usesPlatform,
  type Conflict,
  type CourseChangeCheck,
  type CourseChangeRequest,
  type CourseChangeResult,
} from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { domainError } from '@/modules/teaching/booking/booking.errors';
import { addedLessons, type CourseTold } from './notices/course-change.notice-plan';
import { changePayload } from './course-change.payload';
import type { ChangeRole } from './course-change.plan';
import type { Loaded, Planned } from './course-change.planner';
import { CourseChangeRepo, type ChangeRule, type CourseSub } from './course-change.repo';
import { CourseChangeDeps } from './course-change.writer';
import { SalesBookingScope } from '@/modules/teaching/booking/sales/booking/sales-booking.ownership';
import { assertOwnStudents } from '@/modules/teaching/booking/sales/booking/sales-booking.scope';

/** anyStudent: a key skips «her own students» (the profile's routes; sales.renew_any, docs/16 row 38). */
export interface ChangeActor { user: AuthUser; role: ChangeRole; anyStudent?: boolean }
/** teacherId: «تغيير المعلم» (owner 2026-10-30), the new rules' teacher; absent = the course's. */
export type CourseMove = CourseChangeRequest & { teacherId?: string };

/**
 * «تغيير أيام الحلقات» (owner 2026-10-18, R-ASST-01/04): the course's lessons that have not happened
 * yet move to new days, the teacher, length and zone staying the course's. The assistant changes her
 * own student's course only and never over a clash; the admin may override with a reason. One
 * transaction (change_course): the old rules still reaching the change point end the day before it,
 * every open lesson of the course from it becomes rescheduled, the new rules carry exactly REMAINING
 * lessons (course-change.planner.ts).
 */
@Injectable()
export class CourseChange {
  constructor(
    private readonly queries: CourseChangeRepo,
    private readonly scope: SalesBookingScope,
    private readonly deps: CourseChangeDeps,
  ) {}

  /** POST …/course/change/check: the clashes over the whole remaining course, nothing written. */
  async check(req: CourseMove, actor: ChangeActor): Promise<CourseChangeCheck> {
    const sub = await this.owned(req.subscriptionId, actor);
    const planned = await this.deps.planner.planned(req, actor.role, await this.load(sub));
    const { remaining, endsOn } = planned.plan;
    return { conflicts: await this.conflicts(planned, req.teacherId), remaining, endsOn };
  }

  /**
   * POST …/course/change: 201 CourseChangeResult (a retry with the same clientRequestId returns the
   * first change); 404 subscription_not_found / course_not_found, 403 not_your_student /
   * override_not_allowed, 409 course_finished / custom_count_admin / course_exists / course_changed /
   * conflict (the assistant always, the admin without override.reason), 400 date_in_past /
   * starts_at_mismatch / starts_before_subscription / starts_before_course / no_change /
   * days_count_mismatch / no_occurrences / trial_not_course.
   */
  async change(
    req: CourseMove & { clientRequestId: string },
    actor: ChangeActor,
  ): Promise<CourseChangeResult> {
    const sub = await this.owned(req.subscriptionId, actor);
    const replay = await this.deps.writer.replay(req.clientRequestId, sub.id);
    if (replay) return replay;
    const planned = await this.deps.planner.planned(req, actor.role, await this.load(sub));
    const conflicts = await this.conflicts(planned, req.teacherId);
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
      ...(await this.messaging(planned.active, req.teacherId)),
      counted: planned.counted,
    });
    const told = toldOf({ planned, payload, actorId: actor.user.id, teacherId: req.teacherId });
    return this.deps.writer.apply({ payload, subscriptionId: sub.id, told });
  }

  /** 404 subscription_not_found; for the assistant 403 not_your_student unless the student is hers. */
  private async owned(subscriptionId: string, actor: ChangeActor): Promise<CourseSub> {
    const sub = await this.queries.subscription(subscriptionId);
    if (actor.role === 'sales' && actor.anyStudent !== true)
      assertOwnStudents([sub.student_id], await this.scope.owned(actor.user));
    return sub;
  }

  /**
   * The course's rules (course_rules_of); 400 trial_not_course, 404 course_not_found, 409 course_finished
   * (no active rule) / course_unattributed.
   */
  private async load(sub: CourseSub): Promise<Loaded> {
    if (sub.package === 'trial') throw domainError(HttpStatus.BAD_REQUEST, 'trial_not_course');
    const all = await this.queries.rules(sub.id);
    if (all.length === 0) throw domainError(HttpStatus.NOT_FOUND, 'course_not_found');
    const active = all.filter((r) => r.status === 'active');
    if (active.length === 0) throw domainError(HttpStatus.CONFLICT, 'course_finished');
    // A running rule without subscription_id it cannot own (a group, or one into the next package).
    if (active.some((r) => r.course?.clean === false))
      throw domainError(HttpStatus.CONFLICT, 'course_unattributed');
    return { sub, active, all };
  }

  /** Every new lesson against the (new) teacher's and the student's time; moved lessons, old rules out. */
  private conflicts(p: Planned, teacherId: string | undefined): Promise<Conflict[]> {
    return this.deps.checker.check({
      teacherId: teacherId ?? p.active[0]?.teacher_id ?? '',
      studentIds: [p.sub.student_id],
      proposed: p.plan.plans.flatMap((x) => x.occurrences),
      excludeIds: p.moved.map((m) => m.id),
      excludeRuleIds: p.active.map((r) => r.id),
    });
  }

  /** The confirmation's link and contacts: the (new) teacher's link and mode, the guardians. */
  private async messaging(active: readonly ChangeRule[], newTeacher: string | undefined) {
    const [head] = active;
    const teacher = newTeacher ?? head?.teacher_id;
    const teacherLink = teacher ? await this.queries.teacherLink(teacher) : null;
    const mode = teacher ? await this.queries.teacherMode(teacher) : null;
    const auto = usesPlatform(mode, (await this.deps.planner.settings.read()).meeting_link_auto);
    const contacts = await this.queries.contacts(head ? head.schedule_rule_students.map((s) => s.student_id) : []);
    return { link: { teacherLink, auto }, contacts };
  }
}

interface ToldInput {
  planned: Planned;
  payload: Record<string, unknown>;
  actorId: string;
  teacherId: string | undefined;
}

/** Who hears the change (CourseChangeNotices): the moved and new lessons, a new teacher. */
function toldOf({ planned, payload, actorId, teacherId }: ToldInput): CourseTold {
  const teacherChanged = teacherId !== undefined && teacherId !== planned.active[0]?.teacher_id;
  const added = addedLessons(payload);
  const studentIds = [planned.sub.student_id];
  return { moved: planned.moved, added, actorId, studentIds, teacherChanged };
}
