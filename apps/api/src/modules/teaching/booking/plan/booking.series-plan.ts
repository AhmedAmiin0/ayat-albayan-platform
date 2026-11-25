import type { BookingRequest } from '@ab/shared';
import { type TimeGroup, timeGroups, startOfLocalDay } from '@ab/schedule';
import { DAY_MS, dayInZone, addDays } from '@ab/time';
import { HttpStatus } from '@nestjs/common';
import type { Occurrence } from '@ab/schedule';
import { domainError } from '@/modules/teaching/booking/booking.errors';
import { planBooking, type Plan, type PlanRule } from './booking.plan';

export type SeriesRule = PlanRule & Pick<BookingRequest, 'dayTimes'>;
type SeriesInput = {
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
  const occurrences = plan.occurrences.filter((o) => isoDay(dayInZone(o.starts_at.getTime(), tz)) <= endsOn);
  return { timing: { ...plan.timing, ends_on: endsOn }, occurrences };
}

/** Weeks from now to the start of the day after endsOn (in the family's tz), at least the horizon. */
function courseWeeks(input: SeriesInput, endsOn: string): number {
  const end = startOfLocalDay(addDays(endsOn, 1), input.rule.tz).getTime();
  return Math.max(input.horizonWeeks, (end - input.now.getTime()) / (7 * DAY_MS));
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

/** R-SCH-02/06: one plan per start time; plans[0] pins the first lesson on a DST fall-back. */
export function planSeries(input: SeriesInput): Plan[] {
  const { rule, endsOn } = input;
  const horizonWeeks = endsOn ? courseWeeks(input, endsOn) : input.horizonWeeks;
  const planned = groupsOf(rule).map((g) => {
    const group = { ...rule, byday: g.byday, startTimeLocal: g.startTimeLocal };
    return planBooking({ ...input, horizonWeeks, rule: group });
  });
  const cut = endsOn ? courseCut(planned, endsOn) : planned;
  const plans = cut.sort((a, b) => firstStart(a) - firstStart(b));
  assertApart(plans);
  return plans;
}

const isEmpty = (p: Plan): boolean => p.occurrences.length === 0;

/** Fewer lessons than days keeps empty-day rules so the course's days stay whole; else 400. */
function courseCut(planned: readonly Plan[], endsOn: string): Plan[] {
  if (planned.some(isEmpty)) throw domainError(HttpStatus.BAD_REQUEST, 'no_occurrences');
  const cut = planned.map((p) => capped(p, endsOn));
  if (cut.every(isEmpty)) throw domainError(HttpStatus.BAD_REQUEST, 'no_occurrences');
  return cut;
}

const firstStart = (p: Plan): number => p.occurrences[0]?.starts_at.getTime() ?? Infinity;
