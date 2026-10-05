import { clockTime } from '@ab/shared';
import { ar } from '../../common/i18n/server-text';
import { localDay, weekdayOf } from '../teachers/availability/zoned-time';

// Text helpers for the report template (R-REP-03). Every Arabic word comes from ar.json; LTR
// values (codes, dates, times, phones) are isolated islands (docs/07 §14 rule 4).

/** The academy's Arabic copy, typed from ar.json. */
export const AR = ar;

/** Shown for an empty field: absent students have no grades and often no content. */
export const EMPTY = '—';

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

/** HTML-escape a value the teacher typed. */
export function esc(value: string): string {
  return value.replace(/[&<>"]/g, (c) => ENTITIES[c] ?? c);
}

/** Escaped text with line breaks kept, or «—» when blank. */
export function para(value: string | null): string {
  const text = value?.trim();
  return text ? esc(text).replace(/\r?\n/g, '<br>') : EMPTY;
}

/** Fill `{name}` slots of an ar.json string (values are inserted as given: escape them first). */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (slot, name: string) =>
    name in vars ? String(vars[name]) : slot,
  );
}

/** An LTR island inside Arabic text: AB-0183, 2026-09-29, 17:00, +966 … */
export function ltr(value: string): string {
  return `<bdi dir="ltr" class="ltr">${esc(value)}</bdi>`;
}

/** YYYY-MM-DD of `at` in `tz`. */
export function localDate(at: Date, tz: string): string {
  return new Date(localDay(at.getTime(), tz)).toISOString().slice(0, 10);
}

/** «الثلاثاء» for `at` in `tz` (enums.weekday). */
export function weekdayName(at: Date, tz: string): string {
  const day = String(weekdayOf(localDay(at.getTime(), tz))) as keyof typeof ar.enums.weekday;
  return ar.enums.weekday[day];
}

/** «الرياض» for a curated zone, else the IANA id itself. */
export function cityOf(tz: string): string {
  return (ar.tz as Record<string, string>)[tz] ?? tz;
}

/** «ساعة» for the four standard lengths, else «50 دقيقة». */
export function durationText(minutes: number): string {
  const known = (ar.enums.duration as Record<string, string>)[String(minutes)];
  return known ?? fill(ar.reports.pdf.minutes, { n: minutes });
}

/** «17:00 بتوقيت الرياض» (docs/07 principle 7: every time shows its zone). */
export function timeWithZone(at: Date, tz: string): string {
  return fill(ar.reports.pdf.timeValue, { time: ltr(clockTime(at, tz)), city: esc(cityOf(tz)) });
}

/** «2026/09/29 — 19:05» in `tz`: the generated stamp, as the brand report writes it. */
export function stamp(at: Date, tz: string): string {
  return `${localDate(at, tz).replaceAll('-', '/')} — ${clockTime(at, tz)}`;
}
