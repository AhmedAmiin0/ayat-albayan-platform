import { intlLocale, WEEKDAYS, type Weekday } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';
import { toMin, type Grid, type Range } from './grid';

// The availability track (docs/07 §8): 08:00–24:00, drawn from the inline-start like the text.
const TRACK_START = 8 * 60;
const TRACK_SPAN = 16 * 60;
export const AXIS_HOURS = [8, 12, 16, 20, 24] as const;

/** Wall-clock minute → percent of the track, clamped to 0..100. */
export function trackPct(minute: number): number {
  return Math.min(100, Math.max(0, ((minute - TRACK_START) / TRACK_SPAN) * 100));
}

/** A range as inline-start offset + width (percent); null when it falls outside 08–24. */
export function barBox(range: Range): { start: number; width: number } | null {
  const start = trackPct(toMin(range.start));
  const end = trackPct(toMin(range.end));
  return end > start ? { start, width: end - start } : null;
}

const valid = (ranges: readonly Range[]) =>
  ranges.filter((r) => r.start && r.end && r.start < r.end).toSorted((a, b) => a.start.localeCompare(b.start));

/** Spans where a day's ranges overlap each other: the hatched clash on the track. */
export function overlaps(ranges: readonly Range[]): Range[] {
  const spans: Range[] = [];
  let reach = '';
  for (const r of valid(ranges)) {
    if (r.start < reach) spans.push({ start: r.start, end: r.end < reach ? r.end : reach });
    if (r.end > reach) reach = r.end;
  }
  return spans;
}

/** Available hours in the week; overlapping ranges count once. */
export function weeklyHours(grid: Grid): number {
  let minutes = 0;
  for (const day of WEEKDAYS) {
    let reach = 0;
    for (const r of valid(grid[day])) {
      const end = toMin(r.end);
      minutes += Math.max(0, end - Math.max(toMin(r.start), reach));
      reach = Math.max(reach, end);
    }
  }
  return minutes / 60;
}

const plural = new Intl.PluralRules(intlLocale(locale));

/** «27 ساعة متاحة في الأسبوع» with Arabic number agreement; '' for an empty week. */
export function weeklyHoursLabel(hours: number): string {
  if (hours <= 0) return '';
  const n = Math.round(hours * 10) / 10;
  const form = plural.select(n);
  const forms = t.availability.weeklyHours;
  const text = form === 'one' || form === 'two' || form === 'few' ? forms[form] : forms.other;
  return text.replace('{n}', String(n));
}

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Weekday (0 = الأحد) and minute of the day at `now` in `tz`: today's row and the now-marker. */
export function wallClock(now: Date, tz: string): { weekday: Weekday | undefined; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const index = SHORT_DAYS.indexOf(part('weekday'));
  return {
    weekday: WEEKDAYS.find((d) => d === index),
    minute: Number(part('hour')) * 60 + Number(part('minute')),
  };
}
