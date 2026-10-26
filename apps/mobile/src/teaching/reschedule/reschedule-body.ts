import {
  DURATIONS,
  RIYADH_TZ,
  shiftByday,
  type LessonView,
  type RescheduleRequest,
} from '@ab/shared';
import { ruleFromSlot } from '@/booking/shared/slots';

// POST /lessons/:id/reschedule bodies (R-SCH-07, docs/10 route 8), as the web builds them
// (apps/web/src/features/schedule/reschedule.ts). Mobile has no «احجز رغم التعارض»: no override.

export type Scope = 'one' | 'rule';
type Duration = (typeof DURATIONS)[number];

const MINUTE = 60_000;

/** The family's zone: the first student's, so their wall clock is what stays fixed. */
export function familyTz(lesson: Pick<LessonView, 'students'>): string {
  return lesson.students[0]?.tz ?? RIYADH_TZ;
}

/** The lesson's length when it is a bookable duration (slots and a new rule need one), else null. */
export function lessonDuration(lesson: Pick<LessonView, 'starts_at' | 'ends_at'>): Duration | null {
  const min = Math.round((Date.parse(lesson.ends_at) - Date.parse(lesson.starts_at)) / MINUTE);
  return DURATIONS.find((d) => d === min) ?? null;
}

/** A moved series repeats on the picked slot's weekday (in the family zone) plus any days added. */
export function repeatDays(startsAt: string, tz: string, extra: readonly number[]): number[] {
  return [...new Set([ruleFromSlot(startsAt, tz).weekday, ...extra])].sort((a, b) => a - b);
}

/**
 * A moved series' days before the admin touches them: the old rule's weekdays shifted as far as
 * the lesson moves (Sun+Wed, Wed → Thu = Mon+Thu), so twice a week stays twice a week (the web
 * does the same). Just the slot's day when the rule's days are unknown (an old cache).
 */
export function seriesDays(
  lesson: Pick<LessonView, 'starts_at' | 'rule_byday'>,
  startsAt: string,
  tz: string,
): number[] {
  const to = ruleFromSlot(startsAt, tz).weekday;
  const from = ruleFromSlot(lesson.starts_at, tz).weekday;
  return repeatDays(startsAt, tz, shiftByday({ byday: lesson.rule_byday ?? [], from, to }));
}

interface RescheduleInput {
  lesson: LessonView;
  scope: Scope;
  /** The picked free slot (UTC instant from GET /booking/slots). */
  startsAt: string;
  /** Extra weekdays for scope `rule`. */
  byday: readonly number[];
}

/**
 * `one` moves this lesson to the slot. `rule` ends the series the day before and starts a weekly
 * one at the slot's local day and time in the family zone, same teacher and length. Null when the
 * length is not a bookable duration.
 */
export function rescheduleBody(input: RescheduleInput): RescheduleRequest | null {
  if (input.scope === 'one') return { scope: 'one', startsAt: input.startsAt };
  const durationMin = lessonDuration(input.lesson);
  if (durationMin === null) return null;
  const tz = familyTz(input.lesson);
  const rule = ruleFromSlot(input.startsAt, tz);
  return {
    scope: 'rule',
    newRule: {
      teacherId: input.lesson.teacher.id,
      byday: repeatDays(input.startsAt, tz, input.byday),
      startTimeLocal: rule.startTimeLocal,
      tz,
      durationMin,
      startsOn: rule.startsOn,
    },
  };
}
