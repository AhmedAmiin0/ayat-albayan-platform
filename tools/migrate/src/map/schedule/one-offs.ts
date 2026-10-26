// One-off «تقويم الحجوزات» rows (no «التكرار») dated on or after the import date, status مؤكد /
// مشترك / يحتاج تأكيد → one upcoming lesson + its lesson_students rows (owner 2026-10-26), the free
// trial included (not chargeable). The lesson is created `scheduled`, never confirmed, and carries
// only its time. Its key names the booking, not the time (the calendar event id, else the local
// day), so a booking re-timed in the sheet stays one lesson: a full apply moves it, --creates-only
// leaves the app's copy. Moved to another day without an event id it is a new lesson (cancel the
// old one in the app). rule_id stays null. Pure.
import type { SourceBundle } from '../../entities/contract.ts';
import { keys } from '../../keys.ts';
import { text } from '../../sources/sheets/cells.ts';
import { accepted, issueOnly, issuesFor } from '../../sources/sheets/issues.ts';
import { packageSize } from '../../sources/values.ts';
import { zonedToUtc } from '../../time.ts';
import type { Mapped, NaturalKey, RowIssue, SourceRow } from '../../types.ts';
import { type StudentIndex, studentIndex } from '../people/match.ts';
import { bookingWho } from './booking-row.ts';
import { bookingRows, bookingSlot } from './booking-slot.ts';
import { SHEET_TZ, importFrom } from './bookings.ts';

interface OneOff {
  ref: SourceRow['ref'];
  key: NaturalKey;
  teacher: string;
  students: NaturalKey[];
  startsAt: string;
  endsAt: string;
  trial: boolean;
}

type OneOffResult = OneOff | { issues: RowIssue[] };

function oneOf(row: SourceRow, o: { ix: StudentIndex; from: string }): OneOffResult | null {
  const f = row.fields;
  const issue = issuesFor('lessons', row.ref);
  const slot = bookingSlot(f, o.from);
  if (slot.kind === 'issue' && !text(f['recurrence'])) return { issues: [issue(slot.issue)] };
  if (slot.kind !== 'once') return null;
  const who = bookingWho(row, o.ix);
  if (!('teacher' in who)) return { issues: [issue(who)] };
  const start = zonedToUtc({ date: slot.date, time: slot.time, tz: SHEET_TZ });
  const startsAt = start.toISOString();
  return {
    ref: row.ref,
    key: keys.lesson({
      teacher: who.teacher,
      students: who.students.map((k) => k.key),
      at: `booking:${text(f['calendar_event_id']) ?? slot.date}`,
    }),
    teacher: who.teacher,
    students: who.students,
    startsAt,
    endsAt: new Date(start.getTime() + slot.duration * 60_000).toISOString(),
    trial: packageSize(text(f['package_text'])) === 'trial',
  };
}

function oneOffs(bundle: SourceBundle): OneOffResult[] {
  const o = { ix: studentIndex(bundle.earlier.get('students')), from: importFrom(bundle) };
  return bookingRows(bundle.sheets).flatMap((r) => oneOf(r, o) ?? []);
}

/** Lessons (issues raised here, once). */
export function oneOffLessons(bundle: SourceBundle): Mapped[] {
  return oneOffs(bundle).flatMap((r) => {
    if (!('key' in r)) return issueOnly(r.issues);
    return [
      accepted({
        key: r.key,
        ref: r.ref,
        columns: { starts_at: r.startsAt, ends_at: r.endsAt },
        refs: { teacher_id: keys.teacher(r.teacher) },
      }),
    ];
  });
}

/** lesson_students: attendance left empty (the teacher marks it), a free trial not chargeable. */
export function oneOffLessonStudents(bundle: SourceBundle): Mapped[] {
  return oneOffs(bundle).flatMap((r) =>
    'key' in r
      ? r.students.map((student) =>
          accepted({
            key: keys.lessonStudent({ lesson: r.key.key, student: student.key }),
            ref: r.ref,
            columns: { chargeable: !r.trial },
            refs: { lesson_id: r.key, student_id: student },
          }),
        )
      : [],
  );
}
