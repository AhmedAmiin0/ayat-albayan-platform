// Reads the target for plan/match.ts (SELECT only) and folds adoptions into `existing`.
// Order matters: guardians are adopted before students are matched under them.
import type { TargetDb } from '../../db/target.ts';
import { keyId } from '../../keys.ts';
import type { Existing, RowIssue } from '../../types.ts';
import {
  type MatchResult,
  type StudentRow,
  type TeacherRow,
  matchStudents,
  matchTeachers,
} from './match.ts';
import type { Desired } from '../resolve.ts';

interface MatchTargetInput {
  db: TargetDb;
  desired: readonly Desired[];
  /** Mutated: adopted rows are added as { targetId, hash: null }. */
  existing: Map<string, Existing>;
}

function fold(existing: Map<string, Existing>, r: MatchResult): RowIssue[] {
  for (const [id, targetId] of r.adopt) existing.set(id, { targetId, hash: null });
  return r.issues;
}

export async function matchTarget(o: MatchTargetInput): Promise<RowIssue[]> {
  const { db, existing } = o;
  const fresh = (entity: string) =>
    o.desired.filter((d) => d.key.entity === entity && !existing.has(keyId(d.key)));
  const claimed = new Set(
    [...existing.values()].map((e) => e.targetId).filter((id): id is string => id !== null),
  );
  const issues: RowIssue[] = [];

  const teachers = fresh('teachers');
  if (teachers.length) {
    const rows = await db.select<TeacherRow>({
      text: 'select id::text as id, phone_e164::text as phone_e164, display_name_ar from public.teachers',
      params: [],
    });
    issues.push(...fold(existing, matchTeachers({ fresh: teachers, rows, claimed })));
  }

  const guardians = fresh('guardians');
  const byPhone = await db.findByColumn({
    table: 'guardians',
    column: 'phone_e164',
    values: guardians.map((d) => d.key.key),
  });
  for (const d of guardians) {
    const id = byPhone.get(d.key.key);
    if (id) existing.set(keyId(d.key), { targetId: id, hash: null });
  }

  const guardianIds = new Map<string, string>();
  for (const [k, e] of existing)
    if (k.startsWith('guardians:') && e.targetId) guardianIds.set(k, e.targetId);
  const students = fresh('students');
  if (students.length && guardianIds.size) {
    const rows = await db.select<StudentRow>({
      text: `select id::text as id, guardian_id::text as guardian_id, name, code from public.students
             where guardian_id::text = any($1)`,
      params: [[...new Set(guardianIds.values())]],
    });
    issues.push(...fold(existing, matchStudents({ fresh: students, rows, claimed, guardianIds })));
  }
  return issues;
}
