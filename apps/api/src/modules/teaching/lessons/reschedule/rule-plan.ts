import type { WeeklyRule } from '@ab/shared';
import { randomUUID } from 'node:crypto';
import type { NewLesson, NewRule } from '@/modules/teaching/scheduling/change-set';
import { horizonWindow, localDateOf } from '@/modules/teaching/scheduling/occurrences/horizon';
import { resolveMeetingLink } from '@/modules/teaching/scheduling/meeting-link';
import { ruleOccurrences, type Occurrence } from '@/modules/teaching/scheduling/occurrences/occurrences';
import { ruleStudents, type RuleWithLinks } from '@/modules/teaching/scheduling/schedule.repo';

export type RulePlanInput = {
  old: RuleWithLinks;
  next: WeeklyRule;
  now: Date;
  weeks: number;
};
export type RulePlan = { rule: NewRule; occurrences: Occurrence[] };

/**
 * The replacement rule of a whole-rule reschedule (R-SCH-07, docs/10 route 8 `rule`): same
 * students, package and link (a new teacher drops the old rule's link so their own applies),
 * occurrences over the horizon; a trial keeps one lesson and ends on its day (invariant 4). The
 * assistant's course (owner 2026-10-18; its rules carry subscription_id) keeps its last day, so it
 * never becomes open-ended; any other rule's replacement is open-ended, as before. The replacement
 * keeps subscription_id and first_rule_id, so rescheduling it again still keeps the last day.
 */
export function planNewRule({ old, next, now, weeks }: RulePlanInput): RulePlan {
  const sameTeacher = next.teacherId === old.teacher_id;
  const students = ruleStudents(old);
  const trial = old.package === 'trial';
  const kept = old.subscription_id === null ? null : old.ends_on;
  const timing = {
    byday: next.byday,
    start_time_local: next.startTimeLocal,
    duration_min: next.durationMin,
    tz: next.tz,
    starts_on: next.startsOn,
    ends_on: trial ? null : kept,
  };
  const window = horizonWindow({ now, startsOn: next.startsOn, tz: next.tz, weeks });
  const all = ruleOccurrences(timing, window);
  const occurrences = trial ? all.slice(0, 1) : all;
  const first = occurrences[0];
  const trialEnd = first ? localDateOf(first.starts_at, next.tz) : null;
  const ruleLink = sameTeacher ? old.meeting_link : null;
  return {
    rule: {
      id: randomUUID(),
      teacher_id: next.teacherId,
      duration_min: next.durationMin,
      start_time_local: next.startTimeLocal,
      tz: next.tz,
      byday: next.byday,
      starts_on: next.startsOn,
      ends_on: trial ? trialEnd : kept,
      meeting_link: ruleLink,
      package: old.package,
      created_from_lead_id: old.created_from_lead_id,
      subscription_id: old.subscription_id,
      first_rule_id: old.first_rule_id,
      student_ids: students.ids,
    },
    occurrences,
  };
}

export type LessonsPlanInput = {
  plan: RulePlan;
  link: { teacherLink: string | null; overrides: readonly (string | null)[] };
  /** startsAt ISO strings of occurrences that clash; they carry the override reason. */
  clashes: ReadonlySet<string>;
  overrideReason: string | null;
};

/** The new rule's lesson rows (ids generated here so the confirmation can point at the first). */
export function planLessons({ plan, link, clashes, overrideReason }: LessonsPlanInput): NewLesson[] {
  const meetingLink = resolveMeetingLink({
    explicit: plan.rule.meeting_link,
    studentOverrides: link.overrides,
    teacherLink: link.teacherLink,
  });
  return plan.occurrences.map((o) => {
    const startsAt = o.starts_at.toISOString();
    return {
      id: randomUUID(),
      rule_id: plan.rule.id,
      teacher_id: plan.rule.teacher_id,
      starts_at: startsAt,
      ends_at: o.ends_at.toISOString(),
      meeting_link: meetingLink,
      override_reason: clashes.has(startsAt) ? overrideReason : null,
      rescheduled_from_id: null,
      student_ids: plan.rule.student_ids,
    };
  });
}
