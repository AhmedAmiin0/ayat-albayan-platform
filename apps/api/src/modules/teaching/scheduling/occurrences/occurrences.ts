import {
  DAY_MS,
  dayInZone,
  dayWallToUtc,
  MINUTE_MS,
  minutesOfHhmm,
  weekdayOfDay,
} from '@ab/shared';

/** The schedule_rules columns that decide when lessons happen; a Tables<'schedule_rules'> row fits. */
export type RuleTiming = {
  /** 0 = الأحد … 6 = السبت. */
  byday: readonly number[];
  /** Wall-clock in `tz`, "HH:MM" or Postgres "HH:MM:SS". */
  start_time_local: string;
  duration_min: number;
  tz: string;
  /** Local calendar days in `tz`, inclusive ("YYYY-MM-DD"); ends_on null = open-ended. */
  starts_on: string;
  ends_on: string | null;
};
export type UtcWindow = { from: Date; to: Date };
export type Occurrence = { starts_at: Date; ends_at: Date };

const localDate = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);

/**
 * Every lesson a rule produces with starts_at in [from, to), sorted (R-SCH-02, R-SCH-01).
 * Pure; the DB write is `insert … on conflict (rule_id, starts_at) do nothing` so re-running it
 * over any window never duplicates (issue B1). Wall-clock stays fixed across DST (Intl only).
 * Local days are scanned with a ±1 day margin so a slot whose UTC instant falls on another
 * calendar day than its local one is still found at the window edges.
 */
export function ruleOccurrences(rule: RuleTiming, window: UtcWindow): Occurrence[] {
  const startMin = minutesOfHhmm(rule.start_time_local);
  const days = new Set(rule.byday);
  const from = window.from.getTime();
  const to = window.to.getTime();
  const first = Math.max(dayInZone(from, rule.tz) - DAY_MS, localDate(rule.starts_on));
  const scanEnd = dayInZone(to, rule.tz) + DAY_MS;
  const last = rule.ends_on === null ? scanEnd : Math.min(scanEnd, localDate(rule.ends_on));
  const out: Occurrence[] = [];
  for (let day = first; day <= last; day += DAY_MS) {
    if (!days.has(weekdayOfDay(day))) continue;
    const start = dayWallToUtc(day, startMin, rule.tz);
    if (start < from || start >= to) continue;
    const ends = start + rule.duration_min * MINUTE_MS;
    out.push({ starts_at: new Date(start), ends_at: new Date(ends) });
  }
  return out;
}
