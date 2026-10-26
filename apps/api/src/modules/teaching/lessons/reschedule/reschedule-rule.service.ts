import { isOpenLesson, type RescheduleRequest } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { ConflictChecker } from '../../scheduling/conflicts/conflict-checker';
import { badRequest, conflict } from '../../../../common/http/errors';
import { addDays, localDateOf, startOfLocalDay } from '../../scheduling/occurrences/horizon';
import { ruleStudents } from '../../scheduling/schedule.queries';
import { confirmationMessages, forMessages } from '../status/confirmation-messages';
import type { LessonRow } from '../store/lesson-row';
import { LessonStore } from '../store/lesson-store';
import { planLessons } from './rule-plan';
import { RulePlanner } from './rule-planner';
import { invalidTransition } from '../status/transition';

type RuleScope = Extract<RescheduleRequest, { scope: 'rule' }>;

/**
 * The first day a series move covers: the tapped lesson's local day, never before today. Past
 * lessons nobody marked stay open for their report (issue B2), even a tapped one.
 */
function moveFrom(lesson: LessonRow, tz: string): string {
  const day = localDateOf(new Date(lesson.starts_at), tz);
  const today = localDateOf(new Date(), tz);
  return day > today ? day : today;
}

export type RescheduleRuleInput = { lessonId: string; body: RuleScope; actor: AuthUser };

/**
 * Move the tapped lesson and every later one (R-SCH-07, docs/10 route 8 `rule`): the old rule ends
 * the day before the tapped lesson's local day (today for a past one, moveFrom), its open lessons
 * from that day become `rescheduled` (chargeable false), and a new rule with the same students / package generates from
 * `newRule.startsOn` (never before the tapped lesson, RulePlanner) over the horizon, with the first
 * new lesson's confirmation queued. One transaction. Returns the first new lesson's id. Anchoring
 * on the tapped lesson, not the new start, keeps earlier lessons and moves the tapped one.
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
    // A makeup is one lesson on its own rule: the new rule would drop its link to the missed lesson.
    if ((lesson.makeup_of_id ?? null) !== null) throw badRequest('makeup_scope_one');
    if (!isOpenLesson(lesson.status)) throw invalidTransition(lesson.status, 'reschedule');
    const { old, plan, teacherLink } = await this.planner.plan(lesson, body.newRule);
    const lessonDay = moveFrom(lesson, old.tz);
    const moved = await this.store.queries.openOfRule(old.id, startOfLocalDay(lessonDay, old.tz));
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
    const auto = await this.store.queries.meetingLinkAuto({ teacherId: plan.rule.teacher_id });
    await this.store.commit({
      change: {
        actor: actor.id,
        end_rule: { id: old.id, ends_on: addDays(lessonDay, -1) },
        changes: moved.map((m) => ({ id: m.id, from_status: m.status, to_status: 'rescheduled', chargeable: false })),
        new_rule: plan.rule,
        lessons,
        messages: confirmationMessages(forMessages(first, auto), contacts),
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
