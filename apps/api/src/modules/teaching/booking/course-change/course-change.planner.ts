import { DURATIONS, courseDaysPerWeek, courseLessonCount, wallParts, type CourseChangeRequest, type CourseLessonFact } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { startOfLocalDay } from '@/modules/teaching/scheduling/occurrences/horizon';
import { domainError } from '@/modules/teaching/booking/booking.errors';
import { BookingSettings } from '@/modules/teaching/booking/booking.settings';
import { CourseLessonRepo, type MovedLesson } from './course-change.lessons';
import { assertChange, assertStart, planChange, type ChangePlan, type ChangeRole } from './course-change.plan';
import { unmaterialised } from './course-change.projection';
import { CourseChangeRepo, type ChangeRule, type CourseSub } from './course-change.repo';
import { courseOverlaps } from '@/modules/teaching/booking/sales/course/sales-course.rules';

export interface Loaded { sub: CourseSub; active: ChangeRule[]; all: ChangeRule[] }
export type Planned = Loaded & { plan: ChangePlan; counted: number; moved: MovedLesson[] };

/**
 * A rule without subscription_id (course_rules_of, migration 991) spans packages: only its lessons
 * inside this package's period [from_on, until_on) count for this course.
 */
function inPeriod<T extends { rule_id: string | null; local_date: string | null }>(
  lessons: readonly T[],
  rules: readonly ChangeRule[],
): T[] {
  const by = new Map(rules.map((r) => [r.id, r.course]));
  return lessons.filter((l) => {
    const c = l.rule_id ? by.get(l.rule_id) : undefined;
    if (!c || c.linked) return true;
    const day = l.local_date ?? '';
    return (c.from_on === null || day >= c.from_on) && (c.until_on === null || day < c.until_on);
  });
}

/** A lesson an old rule will still generate before the change point: booked, chargeable. */
const PROJECTED: CourseLessonFact = { status: 'scheduled', chargeable: true, makeup: false, instant: false };

/**
 * The guards, REMAINING and the new plan of «تغيير أيام الحلقات» (course-change.service.ts). The change
 * point is max(start of startsOn in the course zone, now); every open lesson of the course from it moves.
 */
@Injectable()
export class CourseChangePlanner {
  constructor(
    private readonly lessons: CourseLessonRepo,
    private readonly queries: CourseChangeRepo,
    readonly settings: BookingSettings,
  ) {}

  /**
   * 400 starts_at_mismatch / date_in_past / starts_before_subscription / starts_before_course /
   * no_change / days_count_mismatch / no_occurrences, 403 override_not_allowed, 409 custom_count_admin /
   * course_finished / course_exists (the new days overlap another weekly course of the student).
   */
  async planned(
    req: CourseChangeRequest & { teacherId?: string },
    role: ChangeRole,
    loaded: Loaded,
  ): Promise<Planned> {
    const { sub, active, all } = loaded;
    const tz = active[0]?.tz ?? 'Asia/Riyadh';
    const now = new Date();
    if (wallParts(req.startsAt, tz).date !== req.startsOn) throw domainError(HttpStatus.BAD_REQUEST, 'starts_at_mismatch');
    const durationMin = DURATIONS.find((d) => d === sub.duration);
    if (durationMin === undefined) throw new Error(`subscription ${sub.id} has duration ${sub.duration}`);
    const facts = { role, perWeek: courseDaysPerWeek(sub), lessonsTotal: courseLessonCount(sub), durationMin, tz };
    assertChange(req, { ...facts, before: [] }, now);
    const teacherChanged = req.teacherId !== undefined && req.teacherId !== active[0]?.teacher_id;
    assertStart(req, { subStartsOn: sub.starts_on, rules: all, teacherChanged });
    const cutoff = new Date(Math.max(startOfLocalDay(req.startsOn, tz).getTime(), now.getTime()));
    const moved = await this.lessons.openFrom(all.map((r) => r.id), cutoff);
    const before = await this.used({ loaded, moved, req, now });
    const horizonWeeks = (await this.settings.read()).booking_horizon_weeks;
    const plan = planChange({ req, facts: { ...facts, before }, now, horizonWeeks });
    const others = await this.queries.others(sub, all.map((r) => r.id));
    if (courseOverlaps(others, { from: req.startsOn, to: plan.endsOn })) {
      throw domainError(HttpStatus.CONFLICT, 'course_exists');
    }
    return { ...loaded, plan, counted: facts.lessonsTotal - plan.remaining, moved };
  }

  /**
   * What the course has used (review fix 2): every lesson of the student on the course's rules, any
   * time, that is not moved (a counted lesson after the change point stays counted), plus the
   * occurrences the old active rules will still generate before the change point.
   */
  private async used(input: { loaded: Loaded; moved: readonly MovedLesson[]; req: CourseChangeRequest; now: Date }): Promise<CourseLessonFact[]> {
    const { sub, active, all } = input.loaded;
    const movedIds = new Set(input.moved.map((m) => m.id));
    const lessons = inPeriod(await this.lessons.ofCourse({ ruleIds: all.map((r) => r.id), studentId: sub.student_id }), all);
    const held = await this.lessons.held(active.map((r) => r.id));
    const projected = unmaterialised({ rules: active, held, now: input.now, startsOn: input.req.startsOn });
    return [...lessons.filter((l) => !movedIds.has(l.id)), ...Array.from({ length: projected }, () => PROJECTED)];
  }
}
