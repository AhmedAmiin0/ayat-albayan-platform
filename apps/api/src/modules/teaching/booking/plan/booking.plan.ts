import type { BookingRequest } from '@ab/shared';
import {
  ruleOccurrences,
  type Occurrence,
  type RuleTiming,
  type UtcWindow,
} from '../../scheduling/occurrences/occurrences';
import { DAY, localDay, offsetMs, zonedToUtc } from '../../../people/teachers/availability/zoned-time';

export type PlanRule = Pick<
  BookingRequest,
  'byday' | 'startTimeLocal' | 'tz' | 'durationMin' | 'startsOn' | 'startsAt'
> & {
  /** A trial or a makeup: exactly the first occurrence, the rule ends that local day (isSingleLesson). */
  single: boolean;
};
export type PlanInput = { rule: PlanRule; now: Date; horizonWeeks: number };
export type Plan = { timing: RuleTiming; occurrences: Occurrence[] };

/** [max(now, startsOn 00:00 in tz), now + horizon weeks) — docs/10 §3 (R-SCH-02). */
export function horizonWindow(input: PlanInput): UtcWindow {
  const { rule } = input;
  const startsOn = zonedToUtc(Date.parse(`${rule.startsOn}T00:00:00Z`), 0, rule.tz);
  const now = input.now.getTime();
  return {
    from: new Date(Math.max(now, startsOn)),
    to: new Date(now + input.horizonWeeks * 7 * DAY),
  };
}

const isoDay = (day: number) => new Date(day).toISOString().slice(0, 10);
const wall = (instant: number, tz: string) => instant + offsetMs(instant, tz);

/**
 * The slot the admin clicked, when it is the other instance of the first lesson's wall time (DST
 * fall-back repeats an hour; zonedToUtc picks the later one). Otherwise the occurrences as is.
 */
function pinFirst(all: Occurrence[], rule: PlanRule): Occurrence[] {
  const [first, ...rest] = all;
  if (!first || !rule.startsAt) return all;
  const picked = Date.parse(rule.startsAt);
  const at = first.starts_at.getTime();
  if (picked === at || wall(picked, rule.tz) !== wall(at, rule.tz)) return all;
  const length = first.ends_at.getTime() - at;
  return [{ starts_at: new Date(picked), ends_at: new Date(picked + length) }, ...rest];
}

/**
 * The rule and the lessons a booking creates over the horizon (R-SCH-02, R-SCH-06, R-SCH-10). A
 * trial or a makeup is exactly the first occurrence and its rule ends on that local day (docs/10
 * invariant 4); paid packages are open-ended. No occurrence in the window → empty list (the caller rejects it).
 */
export function planBooking(input: PlanInput): Plan {
  const { rule } = input;
  const timing: RuleTiming = {
    byday: rule.byday,
    start_time_local: rule.startTimeLocal,
    duration_min: rule.durationMin,
    tz: rule.tz,
    starts_on: rule.startsOn,
    ends_on: null,
  };
  const all = pinFirst(ruleOccurrences(timing, horizonWindow(input)), rule);
  const [first] = all;
  if (!rule.single || !first) return { timing, occurrences: all };
  const endsOn = isoDay(localDay(first.starts_at.getTime(), rule.tz));
  return { timing: { ...timing, ends_on: endsOn }, occurrences: [first] };
}
