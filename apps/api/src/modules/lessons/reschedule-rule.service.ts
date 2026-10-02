import { isOpenLesson, type RescheduleRequest } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { ConflictChecker } from '../scheduling/conflict-checker';
import { badRequest, conflict } from '../scheduling/errors';
import { addDays, startOfLocalDay } from '../scheduling/horizon';
import { ruleStudents } from '../scheduling/schedule.queries';
import { confirmationMessages } from './confirmation-messages';
import { LessonStore } from './lesson-store';
import { planLessons } from './rule-plan';
import { RulePlanner } from './rule-planner';
import { invalidTransition } from './transition';

type RuleScope = Extract<RescheduleRequest, { scope: 'rule' }>;
export type RescheduleRuleInput = { lessonId: string; body: RuleScope; actor: AuthUser };

/**
 * Move the whole rule from `newRule.startsOn` (R-SCH-07, docs/10 route 8 `rule`): the old rule
 * ends the day before, its open lessons from that local day become `rescheduled` (chargeable
 * false), and a new rule with the same students / package generates over the horizon, with the
 * first new lesson's confirmation queued. One transaction. Returns the first new lesson's id.
 */
@Injectable()
export class RescheduleRuleService {
  constructor(
    private readonly store: LessonStore,
    private readonly planner: RulePlanner,
    private readonly checker: ConflictChecker,
  ) {}

  async reschedule({ lessonId, body, actor }: RescheduleRuleInput): Promise<string> {
    const lesson = await this.store.get(lessonId);
    if (!isOpenLesson(lesson.status)) throw invalidTransition(lesson.status, 'reschedule');
    const { old, plan, teacherLink } = await this.planner.plan(lesson, body.newRule);
    const cutoff = startOfLocalDay(body.newRule.startsOn, old.tz);
    const moved = await this.store.queries.openOfRule(old.id, cutoff);
    const conflicts = await this.checker.check({
      teacherId: plan.rule.teacher_id,
      studentIds: plan.rule.student_ids,
      proposed: plan.occurrences,
      excludeIds: moved.map((m) => m.id),
      excludeRuleIds: [old.id],
    });
    if (conflicts.length > 0 && !body.override) throw conflict('conflict', { conflicts });
    const lessons = planLessons({
      plan,
      link: { teacherLink, overrides: ruleStudents(old).overrides },
      clashes: new Set(conflicts.map((c) => c.startsAt)),
      overrideReason: body.override?.reason ?? null,
    });
    const [first] = lessons;
    if (!first) throw badRequest('no_occurrences');
    const contacts = await this.store.queries.contacts(plan.rule.student_ids);
    await this.store.commit({
      change: {
        actor: actor.id,
        end_rule: { id: old.id, ends_on: addDays(body.newRule.startsOn, -1) },
        changes: moved.map((m) => ({ id: m.id, from_status: m.status, to_status: 'rescheduled', chargeable: false })),
        new_rule: plan.rule,
        lessons,
        messages: confirmationMessages(first, contacts),
      },
      audit: {
        entity: 'schedule_rules',
        entityId: old.id,
        action: 'reschedule',
        before: { status: old.status, ends_on: old.ends_on },
        after: {
          new_rule_id: plan.rule.id,
          starts_on: body.newRule.startsOn,
          moved: moved.map((m) => m.id),
          override_reason: conflicts.length > 0 ? (body.override?.reason ?? null) : null,
          conflicts: conflicts.map((c) => ({ ...c })),
        },
      },
      transition: { from: lesson.status, event: 'reschedule' },
    });
    return first.id;
  }
}
