import type { WeeklyRule } from '@ab/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { SettingsService } from '../../common/settings/settings.service';
import { badRequest, conflict } from '../scheduling/errors';
import { ScheduleQueries, type RuleWithLinks } from '../scheduling/schedule.queries';
import { TeachersQueries } from '../teachers/teachers.queries';
import type { LessonRow } from './lesson-row';
import { planNewRule, type RulePlan } from './rule-plan';

export type PlannedMove = { old: RuleWithLinks; plan: RulePlan; teacherLink: string | null };

/** Loads what a whole-rule reschedule needs and plans the replacement rule (R-SCH-07). */
@Injectable()
export class RulePlanner {
  constructor(
    private readonly rules: ScheduleQueries,
    private readonly teachers: TeachersQueries,
    private readonly settings: SettingsService,
  ) {}

  /** 400 no_rule, 409 rule_not_active, 404 unknown teacher, 400 no_occurrences. */
  async plan(lesson: LessonRow, next: WeeklyRule): Promise<PlannedMove> {
    const old = lesson.rule_id ? await this.rules.rule(lesson.rule_id) : null;
    if (!old) throw badRequest('no_rule');
    if (old.status !== 'active') throw conflict('rule_not_active');
    const teacherLink = await this.teacherLink(old, next.teacherId);
    const weeks = await this.settings.bookingHorizonWeeks();
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
