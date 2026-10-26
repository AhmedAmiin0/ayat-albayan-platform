import type { WeeklyRule } from '@ab/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { badRequest, conflict } from '../../../../common/http/errors';
import { localDateOf } from '../../scheduling/occurrences/horizon';
import { ScheduleQueries, type RuleWithLinks } from '../../scheduling/schedule.queries';
import { TeachersQueries } from '../../../people/teachers/teachers.queries';
import type { LessonRow } from '../store/lesson-row';
import { LessonsSettings } from '../lessons.settings';
import { planNewRule, type RulePlan } from './rule-plan';

export type PlannedMove = { old: RuleWithLinks; plan: RulePlan; teacherLink: string | null };

/** Loads what a whole-rule reschedule needs and plans the replacement rule (R-SCH-07). */
@Injectable()
export class RulePlanner {
  constructor(
    private readonly rules: ScheduleQueries,
    private readonly teachers: TeachersQueries,
    private readonly settings: LessonsSettings,
  ) {}

  /**
   * 400 no_rule, 409 rule_not_active, 404 unknown teacher, 400 no_occurrences, 400 date_in_past
   * for a start before today (it would close lessons nobody marked, issue B2), and 400
   * starts_before_lesson for a start before the tapped lesson's day: the old lessons in between
   * would stay beside the new ones (the old rule is excluded from the clash check).
   */
  async plan(lesson: LessonRow, next: WeeklyRule): Promise<PlannedMove> {
    const old = lesson.rule_id ? await this.rules.rule(lesson.rule_id) : null;
    if (!old) throw badRequest('no_rule');
    if (old.status !== 'active') throw conflict('rule_not_active');
    if (next.startsOn < localDateOf(new Date(), next.tz)) throw badRequest('date_in_past');
    if (next.startsOn < localDateOf(new Date(lesson.starts_at), next.tz)) throw badRequest('starts_before_lesson');
    const teacherLink = await this.teacherLink(old, next.teacherId);
    const weeks = (await this.settings.read()).booking_horizon_weeks;
    const plan = planNewRule({ old, next, now: new Date(), weeks });
    // TODO(R-SCH-07): a start date beyond the horizon has no first lesson yet; owner to decide.
    if (plan.occurrences.length === 0) throw badRequest('no_occurrences');
    return { old, plan, teacherLink };
  }

  /** Link of the new rule's teacher: the same teacher's, or a substitute's (404 if unknown). */
  private async teacherLink(old: RuleWithLinks, teacherId: string): Promise<string | null> {
    if (teacherId === old.teacher_id) return old.teacher?.meeting_link ?? null;
    const teacher = await this.teachers.get(teacherId);
    if (!teacher) throw new NotFoundException();
    return teacher.meeting_link;
  }
}
