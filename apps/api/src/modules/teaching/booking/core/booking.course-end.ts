import { timeGroups, localDateOf, startOfLocalDay } from '@ab/schedule';
import { DAY_MS } from '@ab/time';
import { planBooking } from '@/modules/teaching/booking/plan/booking.plan';
import type { SeriesRule } from '@/modules/teaching/booking/plan/booking.series-plan';

const WEEK = 7 * DAY_MS;

type CourseEndInput = { rule: SeriesRule; now: Date; lessonsTotal: number };

/** Planned far enough to reach the N-th lesson whatever booking_horizon_weeks is. */
export function plannedCourseStarts({ rule, now, lessonsTotal }: CourseEndInput): Date[] {
  const groups = timeGroups(rule);
  const days = groups.reduce((n, g) => n + g.byday.length, 0);
  if (days === 0 || lessonsTotal < 1) return [];
  const startsAt = startOfLocalDay(rule.startsOn, rule.tz).getTime();
  const lead = Math.max(0, startsAt - now.getTime()) / WEEK;
  const horizonWeeks = lead + Math.ceil(lessonsTotal / days) + 1;
  const plans = groups.map((g) => {
    const group = { ...rule, single: false, byday: g.byday, startTimeLocal: g.startTimeLocal };
    return planBooking({ rule: group, now, horizonWeeks });
  });
  if (plans.some((p) => p.occurrences.length === 0)) return [];
  const starts = plans
    .flatMap((p) => p.occurrences.map((o) => o.starts_at))
    .sort((a, b) => a.getTime() - b.getTime());
  return starts.slice(0, lessonsTotal);
}

/**
 * The assistant's course ends on its N-th lesson (owner 2026-10-18 decision 1): the local date (in the
 * family's tz) of the N-th earliest occurrence from now over every time group, so lessons that already
 * passed in the start week are not counted (PR #113 review m5). null when a picked day has no lesson or
 * nothing is counted.
 */
export function plannedCourseEnd(input: CourseEndInput): string | null {
  const starts = plannedCourseStarts(input);
  const nth = starts.length === input.lessonsTotal ? starts.at(-1) : undefined;
  return nth ? localDateOf(nth, input.rule.tz) : null;
}
