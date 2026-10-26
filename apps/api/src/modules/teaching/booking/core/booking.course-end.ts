import { timeGroups } from '@ab/shared';
import { localDateOf, startOfLocalDay } from '../../scheduling/occurrences/horizon';
import { DAY } from '../../../people/teachers/availability/zoned-time';
import { planBooking } from '../plan/booking.plan';
import type { SeriesRule } from '../plan/booking.series-plan';

const WEEK = 7 * DAY;

export type CourseEndInput = { rule: SeriesRule; now: Date; lessonsTotal: number };

/**
 * The assistant's course ends on its N-th lesson (owner 2026-10-18 decision 1): the local date (in the
 * family's tz) of the N-th earliest occurrence from now over every time group, so lessons that already
 * passed in the start week are not counted (PR #113 review m5). Planned far enough to reach the N-th
 * lesson whatever booking_horizon_weeks is. null when a picked day has no lesson or nothing is counted.
 */
export function plannedCourseEnd({ rule, now, lessonsTotal }: CourseEndInput): string | null {
  const groups = timeGroups(rule);
  const days = groups.reduce((n, g) => n + g.byday.length, 0);
  if (days === 0 || lessonsTotal < 1) return null;
  const lead = Math.max(0, startOfLocalDay(rule.startsOn, rule.tz).getTime() - now.getTime()) / WEEK;
  const horizonWeeks = lead + Math.ceil(lessonsTotal / days) + 1;
  const plans = groups.map((g) =>
    planBooking({ rule: { ...rule, single: false, byday: g.byday, startTimeLocal: g.startTimeLocal }, now, horizonWeeks }),
  );
  if (plans.some((p) => p.occurrences.length === 0)) return null;
  const starts = plans.flatMap((p) => p.occurrences.map((o) => o.starts_at)).sort((a, b) => a.getTime() - b.getTime());
  const nth = starts[lessonsTotal - 1];
  return nth ? localDateOf(nth, rule.tz) : null;
}
