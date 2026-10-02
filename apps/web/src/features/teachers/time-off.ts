import { intlLocale, timeOffCreateSchema, type TimeOffCreate } from '@ab/shared';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';

/** Raw `<input type="date">` values (whole days, «إلى» included) + reason, as typed. */
export type TimeOffDraft = { from: string; to: string; reason: string };
export const emptyTimeOffDraft: TimeOffDraft = { from: '', to: '', reason: '' };

// ponytail: whole days in the browser's zone (usually the teacher's own); converting from
// teacher.tz needs the API's zoned-time helper moved to @ab/shared.
/** 'YYYY-MM-DD' → local midnight `days` later, as UTC ISO. `T00:00` keeps the parse local, not UTC. */
const dayStart = (date: string, days = 0) => {
  const d = new Date(`${date}T00:00`);
  if (Number.isNaN(d.getTime())) return date; // blank or bad: the schema reports it
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

/** Draft → POST body (UTC ISO, rule 6; the end is the day after «إلى») or the Arabic error. R-TCH-02. */
export function toTimeOffBody(
  draft: TimeOffDraft,
): { ok: true; body: TimeOffCreate } | { ok: false; error: string } {
  const result = timeOffCreateSchema.safeParse({
    starts_at: dayStart(draft.from),
    ends_at: dayStart(draft.to, 1),
    reason: draft.reason.trim() || null,
  });
  if (result.success) return { ok: true, body: result.data };
  // zod 4 still runs the end>start refine when a date is missing, so "missing" wins.
  const missing = result.error.issues.some((i) => i.message !== 'end_before_start');
  return { ok: false, error: missing ? t.common.required : t.common.endBeforeStart };
}

// Western digits (docs/07 §2): intlLocale carries `nu-latn` in both languages.
const days = new Intl.DateTimeFormat(intlLocale(locale), { weekday: 'long', day: 'numeric', month: 'long' });
const daysAndTimes = new Intl.DateTimeFormat(intlLocale(locale), {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const atMidnight = (d: Date) => d.getHours() === 0 && d.getMinutes() === 0;

/**
 * UTC instants → the span in the viewer's zone. Whole days read as days and the end is exclusive
 * (10th 00:00 → 13th 00:00 = «السبت، 10 – الاثنين، 12 أكتوبر»); anything else keeps its times.
 */
export function formatTimeOff(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (atMidnight(start) && atMidnight(end)) return days.formatRange(start, new Date(end.getTime() - 60_000));
  return daysAndTimes.formatRange(start, end);
}
