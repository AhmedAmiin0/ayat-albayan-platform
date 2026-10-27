import { inWeekOrder, timeGroups, wallParts, WEEK_ORDER, type ClockCycle, type Conflict, type CourseChangeRequest, type DayTime } from '@ab/shared';
import { dayAtText } from '@/booking/shared/picks';
import { t } from '@/core/lib/i18n/i18n';

// A booked course's weekdays as text (owner 2026-10-18): «تابِع بنفس الأيام» names the previous
// course's days, and the clashes of a prefilled day name the weekday to pick again. Pure.

const weekdays: Record<string, string | undefined> = t.enums.weekday;

export const weekdayName = (weekday: number): string => weekdays[String(weekday)] ?? '';

/** «السبت الساعة 9:00، الأحد الساعة 17:00»: each day with its time in `tz`, السبت → الجمعة. */
export function daysText(days: readonly DayTime[], tz: string, cycle: ClockCycle): string {
  return inWeekOrder(days)
    .map((d) => dayAtText({ weekday: d.weekday, time: d.startTimeLocal }, tz, cycle))
    .join(t.common.listSeparator);
}

/** The weekdays and times a change request asks for (its own groups, so a kept day keeps its time). */
export function requestDays(body: Pick<CourseChangeRequest, 'byday' | 'startTimeLocal' | 'dayTimes'>): DayTime[] {
  return timeGroups(body).flatMap((g) => g.byday.map((weekday) => ({ weekday, startTimeLocal: g.startTimeLocal })));
}

export interface TakenInput {
  /** Every pick now (UTC instants). */
  picks: readonly string[];
  /** The prefilled picks (the previous course's days); empty when she picked her own. */
  prefilled: readonly string[];
  /** The family's zone. */
  tz: string;
}

/** The weekdays (in `tz`) of the still-prefilled picks that a clash falls on, السبت first (the web's rule). */
export function takenDays({ picks, prefilled, tz }: TakenInput, conflicts: readonly Pick<Conflict, 'startsAt'>[]): number[] {
  const kept = new Set(picks.filter((p) => prefilled.includes(p)).map((p) => wallParts(p, tz).weekday));
  const hit = new Set(conflicts.map((c) => wallParts(c.startsAt, tz).weekday).filter((w) => kept.has(w)));
  return WEEK_ORDER.filter((w) => hit.has(w));
}

/** «موعد الخميس لم يعد متاحًا، اختر وقتًا آخر لهذا اليوم», one line per day. */
export const takenTexts = (input: TakenInput, conflicts: readonly Pick<Conflict, 'startsAt'>[]): string[] =>
  takenDays(input, conflicts).map((w) => t.booking.courseChange.continueTaken.replace('{day}', weekdayName(w)));
