// SUBS «الطلاب» (the subscribed-students register) and the ATT attendance folders, checked against
// the students being built (pure). A subscribed child the registry does not know is a review row
// (the owner adds them before apply, or their reports and PDFs cannot be linked); a known child
// with more than one lesson in SUBS is active, not trial.
import type { SourceBundle } from '../../entities/contract.ts';
import { keyId, personName } from '../../keys.ts';
import type { Desired } from '../../plan/resolve.ts';
import { num, text } from '../../sources/sheets/cells.ts';
import { issuesFor } from '../../sources/sheets/issues.ts';
import { testReason } from '../../sources/sheets/test-rows.ts';
import { teacherFromText } from '../../sources/values.ts';
import type { RowIssue, SourceRow } from '../../types.ts';
import { type StudentIndex, findStudent, studentIndex } from './match.ts';

export interface SubsFacts {
  /** student keyIds with SUBS «عدد الحلقات» > 1. */
  active: Set<string>;
  issues: RowIssue[];
}

interface Folder {
  ref: SourceRow['ref'];
  name: string;
  teacher: string | null;
  rows: number;
}

/** ATT rows by student folder («تقارير آيات البيان/<student>/سجل حضور — <student>.xlsx»). */
function attFolders(rows: readonly SourceRow[]): Map<string, Folder> {
  const out = new Map<string, Folder>();
  for (const r of rows) {
    const name = (r.ref.file ?? '').split('/').at(-2) ?? '';
    const f = out.get(personName(name));
    if (f) f.rows++;
    else {
      const teacher = teacherFromText(text(r.fields['teacher'])) ?? null;
      out.set(personName(name), { ref: r.ref, name, teacher, rows: 1 });
    }
  }
  return out;
}

const missing = (ref: SourceRow['ref'], detail: string): RowIssue =>
  issuesFor('students', ref)({ code: 'missing_ref', severity: 'review', field: 'student', detail });

interface Ctx {
  ix: StudentIndex;
  att: ReadonlyMap<string, Folder>;
  out: SubsFacts;
}

/** One SUBS row: active when known with more than one lesson, review when unknown. */
function subsRow(r: SourceRow, c: Ctx): string | null {
  const name = text(r.fields['student_name']);
  if (!name || testReason({ names: [name] })) return null;
  const teacher = teacherFromText(text(r.fields['teacher'])) ?? null;
  const found = findStudent(c.ix, { name, teacher });
  const lessons = num(r.fields['lessons_count']) ?? 0;
  if (found.ok && lessons > 1) c.out.active.add(keyId(found.student.key));
  if (!found.ok) {
    const rows = c.att.get(personName(name))?.rows ?? 0;
    const detail = `subscribed student missing from the registry (${found.reason}); teacher=${teacher ?? '?'}, lessons=${lessons}, attendance_rows=${rows}`;
    c.out.issues.push(missing(r.ref, detail));
  }
  return personName(name);
}

export function subsFacts(bundle: SourceBundle, students: readonly Desired[]): SubsFacts {
  const c: Ctx = {
    ix: studentIndex(students),
    att: attFolders(bundle.sheets['att_attendance'] ?? []),
    out: { active: new Set(), issues: [] },
  };
  const inSubs = new Set((bundle.sheets['subs_students'] ?? []).map((r) => subsRow(r, c)));
  for (const [key, f] of c.att) {
    const found = inSubs.has(key) ? null : findStudent(c.ix, { name: f.name, teacher: f.teacher });
    if (!found || found.ok) continue;
    const detail = `attendance folder of a student missing from the registry (${found.reason}); teacher=${f.teacher ?? '?'}, attendance_rows=${f.rows}`;
    c.out.issues.push(missing(f.ref, detail));
  }
  return c.out;
}
