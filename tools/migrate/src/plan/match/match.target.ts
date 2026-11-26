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

interface AdoptCtx {
  db: TargetDb;
  existing: Map<string, Existing>;
  claimed: Set<string>;
}

async function adoptTeachers(ctx: AdoptCtx, teachers: readonly Desired[]): Promise<RowIssue[]> {
  if (!teachers.length) return [];
  const rows = await ctx.db.select<TeacherRow>({
    text: 'select id::text as id, phone_e164::text as phone_e164, display_name_ar from public.teachers',
    params: [],
  });
  return fold(ctx.existing, matchTeachers({ fresh: teachers, rows, claimed: ctx.claimed }));
}

async function adoptGuardians(ctx: AdoptCtx, guardians: readonly Desired[]): Promise<void> {
  const byPhone = await ctx.db.findByColumn({
    table: 'guardians',
    column: 'phone_e164',
    values: guardians.map((d) => d.key.key),
  });
  for (const d of guardians) {
    const id = byPhone.get(d.key.key);
    if (id) ctx.existing.set(keyId(d.key), { targetId: id, hash: null });
  }
}

function guardianIdsOf(existing: ReadonlyMap<string, Existing>): Map<string, string> {
  const guardianIds = new Map<string, string>();
  for (const [k, e] of existing)
    if (k.startsWith('guardians:') && e.targetId) guardianIds.set(k, e.targetId);
  return guardianIds;
}

async function adoptStudents(ctx: AdoptCtx, students: readonly Desired[]): Promise<RowIssue[]> {
  const guardianIds = guardianIdsOf(ctx.existing);
  if (!students.length || !guardianIds.size) return [];
  const rows = await ctx.db.select<StudentRow>({
    text: `select id::text as id, guardian_id::text as guardian_id, name, code from public.students
           where guardian_id::text = any($1)`,
    params: [[...new Set(guardianIds.values())]],
  });
  const { claimed } = ctx;
  return fold(ctx.existing, matchStudents({ fresh: students, rows, claimed, guardianIds }));
}

export async function matchTarget(o: MatchTargetInput): Promise<RowIssue[]> {
  const { db, existing } = o;
  const fresh = (entity: string) =>
    o.desired.filter((d) => d.key.entity === entity && !existing.has(keyId(d.key)));
  const claimed = new Set(
    [...existing.values()].map((e) => e.targetId).filter((id): id is string => id !== null),
  );
  const ctx: AdoptCtx = { db, existing, claimed };
  const teacherIssues = await adoptTeachers(ctx, fresh('teachers'));
  await adoptGuardians(ctx, fresh('guardians'));
  const studentIssues = await adoptStudents(ctx, fresh('students'));
  return [...teacherIssues, ...studentIssues];
}
