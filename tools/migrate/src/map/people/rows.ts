// One PersonRow per child (A4 split), or issues; pure; merging is in collect.ts.
import { keys } from '../../keys.ts';
import { cleanName, splitSiblings } from '../../sources/sheets/siblings.ts';
import { firstText, legacyCode, num, phoneCell, text } from '../../sources/sheets/cells.ts';
import { issuesFor } from '../../sources/sheets/issues.ts';
import { cellsOf, testReason } from '../../sources/sheets/test-rows.ts';
import { bookingStatus } from '../../sources/values.schedule.ts';
import { teacherFromText } from '../../sources/values.ts';
import type { Cell, RowIssue, SourceRow } from '../../types.ts';
import type { Kind, OldClaim, PeopleRowsResult, PersonFields } from './rows.types.ts';

export function fieldsOf(f: Record<string, Cell>, kind: Kind): PersonFields {
  return {
    age: num(f.age),
    gender: text(f.gender),
    country: firstText(f.country, f.tz_country),
    tzCountry: text(f.tz_country),
    level: text(f.level),
    memorized: text(f.memorized),
    goal: text(f.goal),
    riwaya: text(f.riwaya),
    notes: kind === 'booking' ? null : text(f.notes),
    guardianName: text(f.guardian_name),
    source: firstText(f.source, f.source_v2), // A9: two referral-source columns
    teacherText: text(f.teacher),
  };
}

const ACTIVE = /طالب حالي/;

/** What the old rule read in the status column. */
function claimsOf(status: string | null): OldClaim[] {
  const out: OldClaim[] = [];
  if (ACTIVE.test(status ?? '')) out.push('hub_current');
  if (bookingStatus(status) === 'subscribed') out.push('subscribed_booking');
  return out;
}

type Phone = ReturnType<typeof phoneCell>;

function testRow(row: SourceRow, o: { rawName: string | null; phone: Phone }) {
  const reason = testReason({
    names: [o.rawName, row.fields.teacher],
    other: cellsOf(row.fields, ['notes']),
    phone: o.phone.ok ? o.phone.e164 : null,
  });
  return reason
    ? issuesFor('students', row.ref)({ code: 'test_row', severity: 'reject', detail: reason })
    : null;
}

function nameless(row: SourceRow, { kind, phone }: { kind: Kind; phone: Phone }) {
  const severity = phone.ok ? 'review' : 'reject';
  const detail = phone.ok ? 'child name missing: guardian imported, add the child' : undefined;
  const issue = issuesFor('students', row.ref);
  const missing = issue({ code: 'missing_field', severity, field: 'student_name', detail });
  const phoneOnly = phone.ok
    ? { ref: row.ref, phone: phone.e164, fields: fieldsOf(row.fields, kind) }
    : undefined;
  return { rows: [], issues: [missing], phoneOnly };
}

function childIssues(row: SourceRow, { names, fields }: { names: string[]; fields: PersonFields }) {
  const issue = issuesFor('students', row.ref);
  const issues: RowIssue[] = [];
  if (names.length > 1)
    issues.push(
      issue({ code: 'sibling_split', severity: 'review', detail: `children=${names.length}` }),
    );
  const teacherKnown = fields.teacherText ? teacherFromText(fields.teacherText) : undefined;
  if (fields.teacherText && !teacherKnown) {
    const detail = teacherKnown === null ? 'not_a_teacher' : 'unknown_text'; // A3: cities → null
    issues.push(issue({ code: 'unknown_teacher', severity: 'warn', field: 'teacher', detail }));
  }
  return issues;
}

function childRows(row: SourceRow, o: { kind: Kind; phone: string; rawName: string }) {
  const { kind, phone, rawName } = o;
  const f = row.fields;
  const names = splitSiblings(rawName);
  const fields = fieldsOf(f, kind);
  const claims = claimsOf(text(f.status));
  const legacy = legacyCode(f.legacy_code) ?? (kind === 'booking' ? legacyCode(f.notes) : null);
  const rows = names.map((name, i) => ({
    ref: row.ref,
    key: keys.student({ guardianPhone: phone, name }),
    kind,
    phone,
    name,
    legacy: i === 0 ? legacy : null, // the code stays with the first child of a split row
    claims,
    fields,
  }));
  return { rows, issues: childIssues(row, { names, fields }) };
}

/** One source row → its children, or the reasons it is not imported. */
export function personRows(row: SourceRow, kind: Kind): PeopleRowsResult {
  const rawName = text(row.fields.student_name ?? row.fields.name);
  const phone = phoneCell(row.fields.phone);
  const test = testRow(row, { rawName, phone });
  if (test) return { rows: [], issues: [test] };
  if (!rawName || !cleanName(rawName)) return nameless(row, { kind, phone });
  const issue = issuesFor('students', row.ref);
  if (!phone.ok)
    return {
      rows: [],
      issues: [
        issue({ code: 'bad_phone', severity: 'reject', field: 'phone', detail: phone.reason }),
      ],
    };
  return childRows(row, { kind, phone: phone.e164, rawName });
}
