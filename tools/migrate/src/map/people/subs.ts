// A subscribed child the registry lacks is a review row; more than one SUBS lesson means active.
import type { SourceBundle } from '../../entities/contract.ts';
import { keyId, personName } from '../../keys.ts';
import type { Desired } from '../../plan/resolve.ts';
import { num, text } from '../../sources/sheets/cells.ts';
import { issuesFor } from '../../sources/sheets/issues.ts';
import { testReason } from '../../sources/sheets/test-rows.ts';
import { teacherFromText } from '../../sources/values.ts';
import type { RowIssue, SourceRow } from '../../types.ts';
import { type StudentIndex, findStudent, studentIndex } from './match.ts';

interface SubsFacts {
  /** student keyIds with SUBS lesson count > 1. */
  active: Set<string>;
  issues: RowIssue[];
}

interface Folder {
  ref: SourceRow['ref'];
  name: string;
  teacher: string | null;
  rows: number;
}

const rowTeacher = (r: SourceRow): string | null => teacherFromText(text(r.fields.teacher)) ?? null;

/** ATT rows by student folder in the reports zip. */
function attFolders(rows: readonly SourceRow[]): Map<string, Folder> {
  const out = new Map<string, Folder>();
  for (const r of rows) {
    const name = (r.ref.file ?? '').split('/').at(-2) ?? '';
    const f = out.get(personName(name));
    if (f) f.rows++;
    else out.set(personName(name), { ref: r.ref, name, teacher: rowTeacher(r), rows: 1 });
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

interface SubsEntry {
  ref: SourceRow['ref'];
  name: string;
  teacher: string | null;
  lessons: number;
}

function subsEntry(r: SourceRow): SubsEntry | null {
  const name = text(r.fields.student_name);
  if (!name || testReason({ names: [name] })) return null;
  return { ref: r.ref, name, teacher: rowTeacher(r), lessons: num(r.fields.lessons_count) ?? 0 };
}

function subsMissing(e: SubsEntry, o: { att: Ctx['att']; reason: string }): RowIssue {
  const rows = o.att.get(personName(e.name))?.rows ?? 0;
  const detail = `subscribed student missing from the registry (${o.reason}); teacher=${e.teacher ?? '?'}, lessons=${e.lessons}, attendance_rows=${rows}`;
  return missing(e.ref, detail);
}

/** One SUBS row: active when known with more than one lesson, review when unknown. */
function subsRow(r: SourceRow, c: Ctx): string | null {
  const e = subsEntry(r);
  if (!e) return null;
  const found = findStudent(c.ix, { name: e.name, teacher: e.teacher });
  if (found.ok && e.lessons > 1) c.out.active.add(keyId(found.student.key));
  if (!found.ok) c.out.issues.push(subsMissing(e, { att: c.att, reason: found.reason }));
  return personName(e.name);
}

function attFolderIssues(c: Ctx, inSubs: ReadonlySet<string | null>): void {
  for (const [key, f] of c.att) {
    const found = inSubs.has(key) ? null : findStudent(c.ix, { name: f.name, teacher: f.teacher });
    if (!found || found.ok) continue;
    const detail = `attendance folder of a student missing from the registry (${found.reason}); teacher=${f.teacher ?? '?'}, attendance_rows=${f.rows}`;
    c.out.issues.push(missing(f.ref, detail));
  }
}

export function subsFacts(bundle: SourceBundle, students: readonly Desired[]): SubsFacts {
  const c: Ctx = {
    ix: studentIndex(students),
    att: attFolders(bundle.sheets.att_attendance ?? []),
    out: { active: new Set(), issues: [] },
  };
  const inSubs = new Set((bundle.sheets.subs_students ?? []).map((r) => subsRow(r, c)));
  attFolderIssues(c, inSubs);
  return c.out;
}
