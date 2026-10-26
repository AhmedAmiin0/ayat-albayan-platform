// When a «تقويم الحجوزات» row runs, from the import date (`--from`) on (owner 2026-10-26). Only the
// statuses the old Apps Script mirrors to Google are imported: مؤكد, مشترك and يحتاج تأكيد (the
// last as scheduled lessons nobody confirmed yet); مبدئي, تمت, ملغي have no calendar event. Pure.
import { hhmm, num, text, ymd } from '../../sources/sheets/cells.ts';
import type { IssueInput } from '../../sources/sheets/issues.ts';
import { type Recurrence, bookingStatus, parseRecurrence } from '../../sources/values.schedule.ts';
import type { SourceRow } from '../../types.ts';

const DURATIONS = new Set([30, 45, 60, 90]);
const SYNCED = new Set(['confirmed', 'subscribed', 'needs_confirmation']);

/** Rows that are left out on purpose: counted, not issues. */
export type SkipReason = 'status_not_synced' | 'ended_before_from' | 'once_before_from';

interface When {
  date: string;
  time: string;
  duration: number;
}

export type BookingSlot =
  | ({ kind: 'rule'; rec: Recurrence } & When)
  | ({ kind: 'once' } & When)
  | { kind: 'skip'; reason: SkipReason }
  | { kind: 'issue'; issue: IssueInput };

function whenOf(f: SourceRow['fields']): When | null {
  const date = ymd(f['date']);
  const time = hhmm(f['start_time']);
  const duration = num(f['duration_min']);
  if (!date || !time || duration === null || !DURATIONS.has(duration)) return null;
  return { date, time, duration };
}

/** Where a well-formed row lands relative to `from`. */
function placed(rec: Recurrence | null, when: When, from: string): BookingSlot {
  if (rec === null)
    return when.date < from
      ? { kind: 'skip', reason: 'once_before_from' }
      : { kind: 'once', ...when };
  if (rec.until && rec.until < when.date)
    return { kind: 'issue', issue: { code: 'bad_date', severity: 'reject', field: 'recurrence' } };
  if (rec.until && rec.until < from) return { kind: 'skip', reason: 'ended_before_from' };
  return { kind: 'rule', rec, ...when };
}

/**
 * A weekly row → a rule to its «حتى» day (starts_on clamped to `from` on create); a row without «التكرار» → one
 * lesson on its date. Nothing before `from` ('YYYY-MM-DD', Asia/Riyadh): a series that ended
 * before it and a one-off dated before it are skipped. No date or time («ناقص تاريخ أو وقت») →
 * missing_field reject, reported.
 */
export function bookingSlot(f: SourceRow['fields'], from: string): BookingSlot {
  const status = bookingStatus(text(f['status']));
  if (!status || !SYNCED.has(status)) return { kind: 'skip', reason: 'status_not_synced' };
  const rec = parseRecurrence(text(f['recurrence']));
  if (rec === undefined)
    return {
      kind: 'issue',
      issue: { code: 'unmapped_value', severity: 'reject', field: 'recurrence' },
    };
  const when = whenOf(f);
  if (when) return placed(rec, when, from);
  const field = 'date,start_time,duration_min';
  return { kind: 'issue', issue: { code: 'missing_field', severity: 'reject', field } };
}

/** «تقويم الحجوزات» rows, HUB first, BOOK after (with prefer 'last' the newer sync wins, B1). */
export function bookingRows(sheets: Readonly<Record<string, readonly SourceRow[]>>): SourceRow[] {
  return [...(sheets['hub_bookings'] ?? []), ...(sheets['book_bookings'] ?? [])];
}

/** How many rows each skip reason left out (printed by dry-run / apply). */
export function bookingSkips(o: {
  sheets: Readonly<Record<string, readonly SourceRow[]>>;
  from: string;
}): Partial<Record<SkipReason, number>> {
  const out: Partial<Record<SkipReason, number>> = {};
  for (const r of bookingRows(o.sheets)) {
    const s = bookingSlot(r.fields, o.from);
    if (s.kind === 'skip') out[s.reason] = (out[s.reason] ?? 0) + 1;
  }
  return out;
}
