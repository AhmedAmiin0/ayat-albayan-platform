import { DAY_MS, offsetMs } from '@ab/shared';
import { ruleOccurrences, type Occurrence, type RuleTiming } from './occurrences';

/** First day-step instants after `from` (within `days`) at which `tz`'s UTC offset differs. */
export function offsetChanges(tz: string, from: Date, days = 366): Date[] {
  const out: Date[] = [];
  let prev = offsetMs(from.getTime(), tz);
  for (let i = 1; i <= days; i += 1) {
    const at = from.getTime() + i * DAY_MS;
    const offset = offsetMs(at, tz);
    if (offset !== prev) out.push(new Date(at - DAY_MS));
    prev = offset;
  }
  return out;
}

export type ProbeInput = {
  timing: RuleTiming;
  /** The rule's tz and the teacher's tz (availability is kept in the teacher's). */
  tzs: readonly string[];
  /** Horizon end: the generated lessons before it are checked already. */
  after: Date;
};

/**
 * The rule's occurrences in the 8 days around every UTC-offset change of its tz or the teacher's
 * within a year after the horizon (R-SCH-04, issue B3). When only one of the two zones has DST
 * (Riyadh family, Cairo teacher) the lesson moves an hour against the teacher's availability and
 * other rules there, long after the booking-time check of the first weeks. One zone → nothing.
 */
export function probeOccurrences(input: ProbeInput): Occurrence[] {
  const zones = [...new Set(input.tzs)];
  if (zones.length < 2) return [];
  const byStart = new Map<number, Occurrence>();
  for (const at of zones.flatMap((tz) => offsetChanges(tz, input.after))) {
    const window = { from: at, to: new Date(at.getTime() + 8 * DAY_MS) };
    for (const o of ruleOccurrences(input.timing, window)) {
      if (o.starts_at > input.after) byStart.set(o.starts_at.getTime(), o);
    }
  }
  return [...byStart.values()].sort((a, b) => a.starts_at.getTime() - b.starts_at.getTime());
}
