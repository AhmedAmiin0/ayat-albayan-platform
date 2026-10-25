import type { Conflict, CourseChangeRequest } from '@ab/shared';
import { randomUUID } from 'node:crypto';
import { confirmationMessages, forMessages, type Contact } from '../../lessons/status/confirmation-messages';
import { planLessons } from '../../lessons/reschedule/rule-plan';
import type { NewLesson, NewRule } from '../../scheduling/change-set';
import { addDays } from '../../scheduling/occurrences/horizon';
import type { Plan } from '../plan/booking.plan';
import type { ChangePlan, ChangeRole } from './course-change.plan';
import type { ChangeRule, OpenCourseLesson } from './course-change.queries';

// change_course's payload (migration 480): pure, so the whole write is unit-tested.

export type PayloadInput = {
  req: CourseChangeRequest & { clientRequestId: string };
  actor: { id: string; role: ChangeRole };
  subscriptionId: string;
  /** The course's active rules (the first leads): those still reaching the change point end the day before it. */
  active: readonly ChangeRule[];
  moved: readonly (OpenCourseLesson & { rule_id: string | null })[];
  plan: ChangePlan;
  conflicts: readonly Conflict[];
  link: { teacherLink: string | null; auto: boolean };
  contacts: readonly Contact[];
  /** Lessons of the course before the change point that count (lessons_total − remaining). */
  counted: number;
};

/** One new rule per time: the course's teacher, link, package, lead and students; the first leads. */
function newRules(input: PayloadInput, head: ChangeRule): (NewRule & { lessons: NewLesson[] })[] {
  const studentIds = head.schedule_rule_students.map((s) => s.student_id);
  const overrides = head.schedule_rule_students.map(
    (s) => s.student?.meeting_link_override ?? null,
  );
  const clashes = new Set(input.conflicts.map((c) => c.startsAt));
  const firstId = randomUUID();
  return input.plan.plans.map((p: Plan, i) => {
    const rule: NewRule = {
      id: i === 0 ? firstId : randomUUID(),
      teacher_id: head.teacher_id,
      duration_min: p.timing.duration_min,
      start_time_local: p.timing.start_time_local,
      tz: p.timing.tz,
      byday: [...p.timing.byday],
      starts_on: p.timing.starts_on,
      ends_on: input.plan.endsOn,
      meeting_link: head.meeting_link,
      package: head.package,
      created_from_lead_id: head.created_from_lead_id,
      subscription_id: input.subscriptionId,
      first_rule_id: i === 0 ? null : firstId,
      student_ids: studentIds,
    };
    const overrideReason = input.req.override?.reason ?? null;
    const lessons = planLessons({
      plan: { rule, occurrences: p.occurrences },
      link: { teacherLink: input.link.teacherLink, overrides },
      clashes,
      overrideReason,
    });
    return { ...rule, lessons };
  });
}

const moveOf = (m: PayloadInput['moved'][number]) => ({
  id: m.id,
  from_status: m.status,
  to_status: 'rescheduled',
  chargeable: false,
});

/**
 * The active rules still reaching the change point (ends_on null or ≥ startsOn), each ending at
 * min(its ends_on, startsOn − 1): a change never lengthens a rule (review fix 1). A rule already ending
 * before has no end_rule step.
 */
function endRules(input: PayloadInput) {
  const endsOld = addDays(input.req.startsOn, -1);
  return input.active
    .filter((r) => r.ends_on === null || r.ends_on >= input.req.startsOn)
    .map((r) => ({
      id: r.id,
      ends_on: r.ends_on !== null && r.ends_on < endsOld ? r.ends_on : endsOld,
      changes: input.moved.filter((m) => m.rule_id === r.id).map(moveOf),
    }));
}

/**
 * end_rules (endRules, each with its own open lessons from the change point: rescheduled, chargeable
 * false), changes (every other moved lesson, keyed by its id: `moved` is exactly what is written,
 * review fix 3), new_rules with their lessons, the first new lesson's confirmation
 * and the audit row naming the actor's role and the course (entity subscriptions).
 */
export function changePayload(input: PayloadInput): Record<string, unknown> {
  const [head] = input.active;
  if (!head) throw new Error('changePayload needs an active rule');
  const rules = newRules(input, head);
  const first = rules
    .flatMap((r) => r.lessons)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))[0];
  const ending = endRules(input);
  const ended = new Set(ending.map((r) => r.id));
  return {
    actor: input.actor.id,
    client_request_id: input.req.clientRequestId,
    subscription_id: input.subscriptionId,
    starts_on: input.req.startsOn,
    end_rules: ending,
    changes: input.moved.filter((m) => m.rule_id === null || !ended.has(m.rule_id)).map(moveOf),
    new_rules: rules,
    messages: first
      ? confirmationMessages(forMessages(first, input.link.auto), input.contacts)
      : [],
    audit: {
      entity: 'subscriptions',
      entity_id: input.subscriptionId,
      action: 'course_change',
      before: { rule_ids: input.active.map((r) => r.id), ended_rule_ids: [...ended], ends_on: head.ends_on },
      after: {
        by: input.actor.role,
        new_rule_ids: rules.map((r) => r.id),
        starts_on: input.req.startsOn,
        ends_on: input.plan.endsOn,
        remaining: input.plan.remaining,
        counted: input.counted,
        moved: input.moved.map((m) => m.id),
        day_times: rules.map((r) => ({ byday: r.byday, start_time_local: r.start_time_local })),
        override_reason: input.conflicts.length > 0 ? (input.req.override?.reason ?? null) : null,
        conflicts: input.conflicts.map((c) => ({ ...c })),
      },
    },
  };
}
