// Postgres keeps microseconds; a JS Date keeps milliseconds. Comparing a read mark with a
// message's created_at through Date would call «10:00:00.123900» read at «10:00:00.123400».

const FRACTION = /\.(\d+)/;

/** Microseconds since the epoch of an ISO / Postgres instant (any offset); NaN when invalid. */
export function micros(iso: string): number {
  const ms = Date.parse(iso);
  const digits = FRACTION.exec(iso)?.[1] ?? '';
  const extra = Number(digits.padEnd(6, '0').slice(3, 6));
  return Math.floor(ms) * 1000 + extra;
}

/** Is `a` at or after `b`, to the microsecond? */
export const atOrAfter = (a: string, b: string): boolean => micros(a) >= micros(b);
