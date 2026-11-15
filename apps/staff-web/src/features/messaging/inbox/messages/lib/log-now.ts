/**
 * The log's "now": the ticking clock (useNow, a minute apart), or the newest row's time when that
 * is later. A message that arrives in the first minute after midnight is then grouped under
 * «اليوم», never under a stale clock's yesterday. Unparsable stamps are skipped.
 */
export function logNow(tick: Date, stamps: readonly (string | undefined)[]): Date {
  const times = stamps.map((s) => (s ? Date.parse(s) : NaN)).filter(Number.isFinite);
  const newest = Math.max(tick.getTime(), ...times);
  return newest === tick.getTime() ? tick : new Date(newest);
}
