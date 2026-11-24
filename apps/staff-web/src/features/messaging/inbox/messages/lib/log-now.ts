/** Uses the newest row's time when later than the clock, so midnight rows group under today. */
export function logNow(tick: Date, stamps: readonly (string | undefined)[]): Date {
  const times = stamps.map((s) => (s ? Date.parse(s) : NaN)).filter(Number.isFinite);
  const newest = Math.max(tick.getTime(), ...times);
  return newest === tick.getTime() ? tick : new Date(newest);
}
