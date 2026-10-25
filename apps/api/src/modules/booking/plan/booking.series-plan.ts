import { timeGroups, type BookingRequest, type TimeGroup } from '@ab/shared';
import { HttpStatus } from '@nestjs/common';
import type { Occurrence } from '../../scheduling/occurrences';
import { addDays, startOfLocalDay } from '../../scheduling/horizon';
import { DAY, localDay } from '../../teachers/availability/zoned-time';
import { domainError } from '../booking.errors';
import { planBooking, type Plan, type PlanRule } from './booking.plan';

export type SeriesRule = PlanRule & Pick<BookingRequest, 'dayTimes'>;
export type SeriesInput = {
  rule: SeriesRule;
  now: Date;
  horizonWeeks: number;
  /**
   * The assistant's course (owner 2026-10-18 decision 1): every rule ends on this local day
   * (plannedCourseEnd), so exactly the plan's lesson count is generated, all of it planned and
   * checked now whatever the horizon. Absent = open-ended.
   */
  endsOn?: string | null | undefined;
};

const isoDay = (day: number) => new Date(day).toISOString().slice(0, 10);

/** A trial or a makeup is one lesson at one time: always the request's single group, as before. */
function groupsOf(rule: SeriesRule): TimeGroup[] {
  if (rule.single) return [{ startTimeLocal: rule.startTimeLocal, byday: [...rule.byday] }];
  return timeGroups(rule);
}

/** The plan cut at endsOn: timing.ends_on = endsOn, later occurrences dropped. */
function capped(plan: Plan, endsOn: string): Plan {
  const { tz } = plan.timing;
  const occurrences = plan.occurrences.filter((o) => isoDay(localDay(o.starts_at.getTime(), tz)) <= endsOn);
  return { timing: { ...plan.timing, ends_on: endsOn }, occurrences };
}

/** Weeks from now to the start of the day after endsOn (in the family's tz), at least the horizon. */
function courseWeeks(input: SeriesInput, endsOn: string): number {
  const end = startOfLocalDay(addDays(endsOn, 1), input.rule.tz).getTime();
  return Math.max(input.horizonWeeks, (end - input.now.getTime()) / (7 * DAY));
}

const overlaps = (a: Occurrence, b: Occurrence) => a.starts_at < b.ends_at && b.starts_at < a.ends_at;

/** 400 day_times_overlap when a lesson of one time runs into a lesson of another (e.g. across midnight). */
function assertApart(plans: readonly Plan[]): void {
  plans.forEach((plan, i) => {
    const others = plans.slice(i + 1).flatMap((p) => p.occurrences);
    if (plan.occurrences.some((o) => others.some((x) => overlaps(o, x)))) {
      throw domainError(HttpStatus.BAD_REQUEST, 'day_times_overlap');
    }
  });
}

/**
 * One plan per distinct start time (one schedule_rules row each, owner 2026-10-18: «اختر موعدًا لكل
 * يوم»), R-SCH-02 / R-SCH-06: planBooking per timeGroups(rule), sorted by their first lesson (plans[0]
 * is the booking's first rule: its first lesson is the confirmation's, and the picked slot pins it on a
 * DST fall-back). A course is planned through its last day and every picked day must have a lesson
 * (400 no_occurrences). An open-ended group with nothing inside the horizon stays, last and with no
 * lessons, so the daily top-up generates it. An old body without dayTimes is exactly one plan.
 */
export function planSeries(input: SeriesInput): Plan[] {
  const { rule, endsOn } = input;
  const horizonWeeks = endsOn ? courseWeeks(input, endsOn) : input.horizonWeeks;
  const plans = groupsOf(rule)
    .map((g) => planBooking({ ...input, horizonWeeks, rule: { ...rule, byday: g.byday, startTimeLocal: g.startTimeLocal } }))
    .map((p) => (endsOn ? capped(p, endsOn) : p))
    .sort((a, b) => firstStart(a) - firstStart(b));
  if (endsOn && plans.some((p) => p.occurrences.length === 0)) throw domainError(HttpStatus.BAD_REQUEST, 'no_occurrences');
  assertApart(plans);
  return plans;
}

const firstStart = (p: Plan): number => p.occurrences[0]?.starts_at.getTime() ?? Infinity;
