// People rows: HUB «الطلاب» (master), «ردود التسجيل», confirmed «تقويم الحجوزات» rows → one
// PersonRow per child (A4 split), or issues. Pure; merging by natural key is in collect.ts.
import { keys } from '../../keys.ts';
import { cleanName, splitSiblings } from '../../sources/sheets/siblings.ts';
import { firstText, legacyCode, num, phoneCell, text } from '../../sources/sheets/cells.ts';
import { issuesFor } from '../../sources/sheets/issues.ts';
import { cellsOf, testReason } from '../../sources/sheets/test-rows.ts';
import { bookingStatus } from '../../sources/values.schedule.ts';
import { teacherFromText } from '../../sources/values.ts';
import type { Cell, NaturalKey, RowIssue, SourceRow } from '../../types.ts';

export interface PersonFields {
  age: number | null;
  gender: string | null;
  country: string | null;
  /** «الدولة / التوقيت»: the zone the family said they attend in (beats the phone's). */
  tzCountry: string | null;
  level: string | null;
  memorized: string | null;
  goal: string | null;
  riwaya: string | null;
  notes: string | null;
  guardianName: string | null;
  source: string | null;
  teacherText: string | null;
}

export interface PersonRow {
  ref: SourceRow['ref'];
  key: NaturalKey;
  kind: Kind;
  phone: string;
  name: string;
  legacy: number | null;
  /** Why the old rule called this child active: reported as downgrades only, never a status. */
  claims: OldClaim[];
  fields: PersonFields;
}

/** HUB «طالب حالي», a «مشترك» booking, a HEART «subscription» row (docs/06 status mapping). */
export type OldClaim = 'hub_current' | 'subscribed_booking' | 'heart_row';

/** A row with a valid phone but no child name: the family (guardian) is kept, the child is not. */
export interface PhoneOnly {
  ref: SourceRow['ref'];
  phone: string;
  fields: PersonFields;
}

interface PeopleRowsResult {
  rows: PersonRow[];
  issues: RowIssue[];
  phoneOnly?: PhoneOnly;
}

export type Kind = 'student' | 'registration' | 'booking' | 'heart';

export function fieldsOf(f: Record<string, Cell>, kind: Kind): PersonFields {
  return {
    age: num(f['age']),
    gender: text(f['gender']),
    country: firstText(f['country'], f['tz_country']),
    tzCountry: text(f['tz_country']),
    level: text(f['level']),
    memorized: text(f['memorized']),
    goal: text(f['goal']),
    riwaya: text(f['riwaya']),
    notes: kind === 'booking' ? null : text(f['notes']),
    guardianName: text(f['guardian_name']),
    source: firstText(f['source'], f['source_v2']), // A9: two «عرفت عننا منين؟» columns
    teacherText: text(f['teacher']),
  };
}

const ACTIVE = /طالب حالي/;

/** What the old rule read in «الحالة»: HUB «طالب حالي», a «مشترك» booking. */
function claimsOf(status: string | null): OldClaim[] {
  const out: OldClaim[] = [];
  if (ACTIVE.test(status ?? '')) out.push('hub_current');
  if (bookingStatus(status) === 'subscribed') out.push('subscribed_booking');
  return out;
}

/** One source row → its children, or the reasons it is not imported. */
export function personRows(row: SourceRow, kind: Kind): PeopleRowsResult {
  const f = row.fields;
  const issue = issuesFor('students', row.ref);
  const rawName = text(f['student_name'] ?? f['name']);
  const phone = phoneCell(f['phone']);
  const reason = testReason({
    names: [rawName, f['teacher']],
    other: cellsOf(f, ['notes']),
    phone: phone.ok ? phone.e164 : null,
  });
  if (reason)
    return { rows: [], issues: [issue({ code: 'test_row', severity: 'reject', detail: reason })] };
  if (!rawName || !cleanName(rawName)) {
    const severity = phone.ok ? 'review' : 'reject';
    const detail = phone.ok ? 'child name missing: guardian imported, add the child' : undefined;
    const missing = issue({ code: 'missing_field', severity, field: 'student_name', detail });
    const phoneOnly = phone.ok
      ? { ref: row.ref, phone: phone.e164, fields: fieldsOf(f, kind) }
      : undefined;
    return { rows: [], issues: [missing], phoneOnly };
  }
  if (!phone.ok)
    return {
      rows: [],
      issues: [
        issue({ code: 'bad_phone', severity: 'reject', field: 'phone', detail: phone.reason }),
      ],
    };
  const names = splitSiblings(rawName);
  const issues: RowIssue[] = [];
  if (names.length > 1)
    issues.push(
      issue({ code: 'sibling_split', severity: 'review', detail: `children=${names.length}` }),
    );
  const fields = fieldsOf(f, kind);
  const teacherKnown = fields.teacherText ? teacherFromText(fields.teacherText) : undefined;
  if (fields.teacherText && !teacherKnown) {
    const detail = teacherKnown === null ? 'not_a_teacher' : 'unknown_text'; // A3: cities → null
    issues.push(issue({ code: 'unknown_teacher', severity: 'warn', field: 'teacher', detail }));
  }
  const claims = claimsOf(text(f['status']));
  const legacy =
    legacyCode(f['legacy_code']) ?? (kind === 'booking' ? legacyCode(f['notes']) : null);
  const rows = names.map((name, i) => ({
    ref: row.ref,
    key: keys.student({ guardianPhone: phone.e164, name }),
    kind,
    phone: phone.e164,
    name,
    legacy: i === 0 ? legacy : null, // the code stays with the first child of a split row
    claims,
    fields,
  }));
  return { rows, issues };
}

/** Booking rows that make people: only confirmed / subscribed (docs/06 schedule_rules). */
export function isPeopleBooking(row: SourceRow): boolean {
  const s = bookingStatus(text(row.fields['status']));
  return s === 'confirmed' || s === 'subscribed';
}
