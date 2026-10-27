// Who a «تقويم الحجوزات» row books: its students (by guardian phone + name, siblings split, A4)
// and its teacher («المعلم/ة» via teacherFromText; empty → the student's teacher). Pure.
import type { NaturalKey, SourceRow } from '../../types.ts';
import { phoneCell, text } from '../../sources/sheets/cells.ts';
import type { IssueInput } from '../../sources/sheets/issues.ts';
import { splitSiblings } from '../../sources/sheets/siblings.ts';
import { testReason } from '../../sources/sheets/test-rows.ts';
import { teacherFromText } from '../../sources/values.ts';
import { type StudentIndex, findStudent } from '../people/match.ts';

/** Students the row names, or the reject: test row, bad phone, no name, student not imported. */
export function bookingStudents(row: SourceRow, ix: StudentIndex): NaturalKey[] | IssueInput {
  const phone = phoneCell(row.fields['phone']);
  const raw = text(row.fields['name']);
  const reason = testReason({
    names: [raw, row.fields['teacher']],
    phone: phone.ok ? phone.e164 : null,
  });
  if (reason) return { code: 'test_row', severity: 'reject', detail: reason };
  if (!phone.ok)
    return { code: 'bad_phone', severity: 'reject', field: 'phone', detail: phone.reason };
  if (!raw) return { code: 'missing_field', severity: 'reject', field: 'name' };
  const out: NaturalKey[] = [];
  for (const name of splitSiblings(raw)) {
    const r = findStudent(ix, { phone: phone.e164, name });
    if (!r.ok)
      return { code: 'missing_ref', severity: 'reject', field: 'student', detail: r.reason };
    out.push(r.student.key);
  }
  return out;
}

/** Teacher slug: the column when set (unknown text → unknown_teacher), else the student's. */
function bookingTeacher(
  row: SourceRow,
  ix: StudentIndex,
  students: NaturalKey[],
): string | IssueInput {
  const raw = text(row.fields['teacher']);
  if (raw) {
    const slug = teacherFromText(raw);
    return slug ?? { code: 'unknown_teacher', severity: 'reject', field: 'teacher' };
  }
  const ids = new Set(students.map((k) => k.key));
  const own = ix.all.find((s) => ids.has(s.key.key) && s.record.refs['teacher_id']);
  return (
    own?.record.refs['teacher_id']?.key ?? {
      code: 'missing_field',
      severity: 'reject',
      field: 'teacher',
    }
  );
}

/** Students then teacher of one row, or the first reject. */
export function bookingWho(
  row: SourceRow,
  ix: StudentIndex,
): { students: NaturalKey[]; teacher: string } | IssueInput {
  const students = bookingStudents(row, ix);
  if (!Array.isArray(students)) return students;
  const teacher = bookingTeacher(row, ix, students);
  return typeof teacher === 'string' ? { students, teacher } : teacher;
}
