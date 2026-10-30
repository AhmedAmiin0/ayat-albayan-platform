// Golden sweeps (docs/34 §6): the inputs every old-vs-new date test runs over. A full year in the
// academy's zones and two DST zones, with both year ends, the month ends and Cairo's 2026-10-29.

export const GOLDEN_ZONES = [
  'Africa/Cairo',
  'Asia/Riyadh',
  'Asia/Dubai',
  'Asia/Kuwait',
  'Asia/Qatar',
  'Europe/London',
  'America/New_York',
] as const;

const DAY = 86_400_000;
const FIRST = Date.parse('2025-12-24T00:00:00Z');
const LAST = Date.parse('2027-01-08T00:00:00Z');

/** Every calendar date from 2025-12-24 to 2027-01-07 («YYYY-MM-DD»). */
export function goldenDates(): string[] {
  const out: string[] = [];
  for (let t = FIRST; t < LAST; t += DAY) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

/** Wall times around midnight and the 00:00–03:00 DST hours, noon and the day's end. */
export const GOLDEN_TIMES = [
  '00:00', '00:30', '00:59', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30',
  '12:00', '18:45', '22:00', '23:00', '23:30', '23:59',
];

/** Every `stepMin` minutes over the sweep, as UTC instants. */
export function goldenInstants(stepMin = 30): Date[] {
  const out: Date[] = [];
  for (let t = FIRST; t < LAST; t += stepMin * 60_000) out.push(new Date(t));
  return out;
}

/** FNV-1a (32 bit) of the lines: a fixed value that pins a whole sweep's output. */
export function digest(lines: readonly string[]): string {
  let h = 0x811c9dc5;
  for (const line of lines) {
    for (let i = 0; i < line.length; i += 1) {
      h ^= line.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    h = Math.imul(h ^ 10, 0x01000193) >>> 0;
  }
  return `${lines.length}:${h.toString(16).padStart(8, '0')}`;
}
