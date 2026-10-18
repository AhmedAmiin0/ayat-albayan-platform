import { timeGroups, type BookingRequest, type TimeGroup } from '@ab/shared';
import { HttpStatus } from '@nestjs/common';
import type { Occurrence } from '../scheduling/occurrences';
import { localDay } from '../teachers/availability/zoned-time';
import { domainError } from './booking.errors';
import { planBooking, type Plan, type PlanRule } from './booking.plan';

export type SeriesRule = PlanRule & Pick<BookingRequest, 'dayTimes'>;
export type SeriesInput = {
  rule: SeriesRule;
  now: Date;
  horizonWeeks: number;
  /**
   * The assistant's course (owner 2026-10-18 decision 1): every rule ends on this local day
   * (courseEndsOn), so exactly the plan's lesson count is generated. Absent = open-ended.
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
 * يوم»), R-SCH-02 / R-SCH-06: planBooking per timeGroups(rule), groups without an occurrence in
 * the window dropped, sorted by their first lesson (plans[0] is the booking's first rule: its first
 * lesson is the confirmation's, and the picked slot pins it on a DST fall-back). An old body without
 * dayTimes is exactly one plan, as before. [] = no occurrence at all (the caller rejects it).
 */
export function planSeries(input: SeriesInput): Plan[] {
  const { rule, endsOn } = input;
  const plans = groupsOf(rule)
    .map((g) => planBooking({ ...input, rule: { ...rule, byday: g.byday, startTimeLocal: g.startTimeLocal } }))
    .map((p) => (endsOn ? capped(p, endsOn) : p))
    .filter((p) => p.occurrences.length > 0)
    .sort((a, b) => firstStart(a) - firstStart(b));
  assertApart(plans);
  return plans;
}

const firstStart = (p: Plan): number => p.occurrences[0]?.starts_at.getTime() ?? Infinity;
