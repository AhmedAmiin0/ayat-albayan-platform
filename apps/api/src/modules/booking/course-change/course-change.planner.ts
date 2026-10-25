import { DURATIONS, courseDaysPerWeek, wallParts, type CourseChangeRequest, type CourseLessonFact } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { startOfLocalDay } from '../../scheduling/horizon';
import { domainError } from '../booking.errors';
import { BookingSettings } from '../booking.settings';
import { CourseLessonQueries, type MovedLesson } from './course-change.lessons';
import { assertChange, assertStart, planChange, type ChangePlan, type ChangeRole } from './course-change.plan';
import { unmaterialised } from './course-change.projection';
import { CourseChangeQueries, type ChangeRule, type CourseSub } from './course-change.queries';
import { courseOverlaps } from '../sales/course/sales-course.rules';

export type Loaded = { sub: CourseSub; active: ChangeRule[]; all: ChangeRule[] };
export type Planned = Loaded & { plan: ChangePlan; counted: number; moved: MovedLesson[] };

/** A lesson an old rule will still generate before the change point: booked, chargeable. */
const PROJECTED: CourseLessonFact = { status: 'scheduled', chargeable: true, makeup: false, instant: false };

/**
 * The guards, REMAINING and the new plan of «تغيير أيام الحلقات» (course-change.service.ts). The change
 * point is max(start of startsOn in the course zone, now); every open lesson of the course from it moves.
 */
@Injectable()
export class CourseChangePlanner {
  constructor(
    private readonly lessons: CourseLessonQueries,
    private readonly queries: CourseChangeQueries,
    readonly settings: BookingSettings,
  ) {}

  /**
   * 400 starts_at_mismatch / date_in_past / starts_before_subscription / starts_before_course /
   * no_change / days_count_mismatch / no_occurrences, 403 override_not_allowed, 409 custom_count_admin /
   * course_finished / course_exists (the new days overlap another weekly course of the student).
   */
  async planned(req: CourseChangeRequest, role: ChangeRole, loaded: Loaded): Promise<Planned> {
    const { sub, active, all } = loaded;
    const tz = active[0]?.tz ?? 'Asia/Riyadh';
    const now = new Date();
    if (wallParts(req.startsAt, tz).date !== req.startsOn) throw domainError(HttpStatus.BAD_REQUEST, 'starts_at_mismatch');
    const durationMin = DURATIONS.find((d) => d === sub.duration);
    if (durationMin === undefined) throw new Error(`subscription ${sub.id} has duration ${sub.duration}`);
    const facts = { role, perWeek: courseDaysPerWeek(sub), lessonsTotal: sub.lessons_total, durationMin, tz };
    assertChange(req, { ...facts, before: [] }, now);
    assertStart(req, { subStartsOn: sub.starts_on, rules: all });
    const cutoff = new Date(Math.max(startOfLocalDay(req.startsOn, tz).getTime(), now.getTime()));
    const moved = await this.lessons.openFrom(all.map((r) => r.id), cutoff);
    const before = await this.used({ loaded, moved, req, now });
    const horizonWeeks = (await this.settings.read()).booking_horizon_weeks;
    const plan = planChange({ req, facts: { ...facts, before }, now, horizonWeeks });
    if (courseOverlaps(await this.queries.others(sub), { from: req.startsOn, to: plan.endsOn })) {
      throw domainError(HttpStatus.CONFLICT, 'course_exists');
    }
    return { ...loaded, plan, counted: sub.lessons_total - plan.remaining, moved };
  }

  /**
   * What the course has used (review fix 2): every lesson of the student on the course's rules, any
   * time, that is not moved (a counted lesson after the change point stays counted), plus the
   * occurrences the old active rules will still generate before the change point.
   */
  private async used(input: { loaded: Loaded; moved: readonly MovedLesson[]; req: CourseChangeRequest; now: Date }): Promise<CourseLessonFact[]> {
    const { sub, active, all } = input.loaded;
    const movedIds = new Set(input.moved.map((m) => m.id));
    const lessons = await this.lessons.ofCourse({ ruleIds: all.map((r) => r.id), studentId: sub.student_id });
    const held = await this.lessons.held(active.map((r) => r.id));
    const projected = unmaterialised({ rules: active, held, now: input.now, startsOn: input.req.startsOn });
    return [...lessons.filter((l) => !movedIds.has(l.id)), ...Array.from({ length: projected }, () => PROJECTED)];
  }
}
