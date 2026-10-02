// When did a reported lesson start? The report form only has a date; «تقويم الحجوزات» rows (any
// status) give the booked wall-clock time and duration of that student: on the row's own date,
// and for a weekly row («أسبوعي: …») on every booked weekday from that date to «حتى» (or today).
// A row booked for that exact date beats a weekly one. Pure.
import type { SourceBundle } from '../../entities/contract.ts';
import { hhmm, num, phoneCell, text, ymd } from '../../sources/sheets/cells.ts';
import { splitSiblings } from '../../sources/sheets/siblings.ts';
import { parseRecurrence } from '../../sources/values.schedule.ts';
import type { SourceRow } from '../../types.ts';
import { type StudentIndex, findStudent } from '../people/match.ts';

export interface Slot {
  time: string;
  duration: number;
}

const DAY_MS = 86_400_000;

/** Dates in [from, to] (inclusive, 'YYYY-MM-DD') whose weekday (0 = Sunday) is in byday. */
export function weeklyDates(o: { from: string; to: string; byday: readonly number[] }): string[] {
  const out: string[] = [];
  const end = Date.parse(`${o.to}T00:00:00Z`);
  for (let t = Date.parse(`${o.from}T00:00:00Z`); t <= end; t += DAY_MS) {
    if (o.byday.includes(new Date(t).getUTCDay())) out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

interface Booked {
  students: string[];
  slot: Slot;
  /** The row's own date first; then, for a weekly row, its other weekdays. */
  exact: string;
  weekly: string[];
}

function booked(r: SourceRow, o: { ix: StudentIndex; today: string }): Booked | null {
  const phone = phoneCell(r.fields['phone']);
  const date = ymd(r.fields['date']);
  const time = hhmm(r.fields['start_time']);
  if (!phone.ok || !date || !time) return null;
  const students = splitSiblings(text(r.fields['name']) ?? '').flatMap((name) => {
    const s = findStudent(o.ix, { phone: phone.e164, name });
    return s.ok ? [s.student.key.key] : [];
  });
  const rec = parseRecurrence(text(r.fields['recurrence']));
  const to = rec?.until && rec.until < o.today ? rec.until : o.today;
  const weekly = rec ? weeklyDates({ from: date, to, byday: rec.byday }) : [];
  return {
    students,
    slot: { time, duration: num(r.fields['duration_min']) ?? 45 },
    exact: date,
    weekly,
  };
}

/** studentKey|YYYY-MM-DD → booked slot (exact-date rows first, then weekly; first row wins). */
export function bookingSlots(bundle: SourceBundle, ix: StudentIndex): Map<string, Slot> {
  const out = new Map<string, Slot>();
  const rows = [
    ...(bundle.sheets['hub_bookings'] ?? []),
    ...(bundle.sheets['book_bookings'] ?? []),
  ];
  const all = rows.flatMap((r) => booked(r, { ix, today: bundle.today }) ?? []);
  const put = (b: Booked, dates: readonly string[]) => {
    for (const s of b.students)
      for (const d of dates) if (!out.has(`${s}|${d}`)) out.set(`${s}|${d}`, b.slot);
  };
  for (const b of all) put(b, [b.exact]);
  for (const b of all) put(b, b.weekly);
  return out;
}

/** Unknown time: noon Riyadh keeps the local date in every family's zone (UTC+2…+4). */
export const UNKNOWN_TIME: Slot = { time: '12:00', duration: 45 };
