import { DURATIONS, shiftByday, type LessonView, type RescheduleRequest } from '@ab/shared';
import { ruleFromSlot } from '@/features/booking/draft/draft';
import { durationMin } from './lessons';
import { RIYADH_TZ } from './tz';
import type { Scope } from './ScopeRadios';

export interface RescheduleInput {
  lesson: LessonView;
  scope: Scope;
  /** The new start picked on the slot grid (UTC). */
  startsAt: string;
  /** Extra repeat days for scope `rule`; the new start's weekday is always included. */
  byday: readonly number[];
  /** Reason to move over conflicts (R-SCH-04). */
  override?: string | undefined;
}

/** The family's zone: the (first) student's, so their wall clock stays fixed. */
export function familyTz(lesson: Pick<LessonView, 'students'>): string {
  return lesson.students[0]?.tz ?? RIYADH_TZ;
}

/**
 * A moved series' days before the admin touches them: the old rule's weekdays shifted as far as
 * this lesson moves (Sun+Wed, Wed → Thu = Mon+Thu), so a twice-a-week series stays twice a week.
 * Just the new slot's day when the lesson's rule days are unknown.
 */
export function seriesDays(lesson: Pick<LessonView, 'starts_at' | 'rule_byday' | 'students'>, startsAt: string): number[] {
  const tz = familyTz(lesson);
  const to = ruleFromSlot(startsAt, tz).weekday;
  const from = ruleFromSlot(lesson.starts_at, tz).weekday;
  return [...new Set([to, ...shiftByday({ byday: lesson.rule_byday ?? [], from, to })])].sort((a, b) => a - b);
}

/**
 * POST /lessons/:id/reschedule body (R-SCH-07): `one` moves this occurrence; `rule` ends the rule
 * and starts a new weekly one at the picked local day/time in the family zone. Null when the
 * lesson length is not a bookable duration (a new rule needs one).
 */
export function rescheduleBody(i: RescheduleInput): RescheduleRequest | null {
  const override = i.override ? { override: { reason: i.override } } : {};
  if (i.scope === 'one') return { scope: 'one', startsAt: i.startsAt, ...override };
  const length = DURATIONS.find((d) => d === durationMin(i.lesson));
  if (!length) return null;
  const tz = familyTz(i.lesson);
  const rule = ruleFromSlot(i.startsAt, tz);
  return {
    scope: 'rule',
    newRule: {
      teacherId: i.lesson.teacher.id,
      byday: [...new Set([rule.weekday, ...i.byday])].sort((a, b) => a - b),
      startTimeLocal: rule.startTimeLocal,
      tz,
      durationMin: length,
      startsOn: rule.startsOn,
    },
    ...override,
  };
}
