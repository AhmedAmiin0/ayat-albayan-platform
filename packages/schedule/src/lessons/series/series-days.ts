// A series reschedule (R-SCH-07) shifts the old weekdays by the tapped lesson's move.

const mod7 = (n: number) => ((n % 7) + 7) % 7;

export interface SeriesShift {
  /** The old rule's weekdays (0 = Sunday). */
  byday: readonly number[];
  /** The tapped lesson's weekday and the new slot's, in the rule's zone. */
  from: number;
  to: number;
}

/** The new rule's weekdays: the old ones shifted by (to − from), sorted, no repeats. */
export function shiftByday({ byday, from, to }: SeriesShift): number[] {
  return [...new Set(byday.map((d) => mod7(d + to - from)))].sort((a, b) => a - b);
}
