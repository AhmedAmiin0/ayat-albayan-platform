// Legacy AB codes vs the target (SELECT only). A code another target student already holds cannot
// be inserted again: the planned student keeps everything but the code (the target draws a new
// one) and the owner gets a review row naming the code — decided in the dry-run, never at apply.
// A student imported earlier keeps the code only if the target row holding it is that student,
// so a re-run plans no code change writeStudent could never make (codes are insert-only).
import type { TargetDb } from '../db/target.ts';
import { recordHash } from '../hash.ts';
import { keyId } from '../keys.ts';
import type { Existing, RowIssue } from '../types.ts';
import type { Desired } from './resolve.ts';

const codeOf = (d: Desired): number | null => {
  const c = d.record.columns['code_seq'];
  return d.key.entity === 'students' && typeof c === 'number' ? c : null;
};

const label = (n: number): string => `AB-${String(n).padStart(4, '0')}`;

/** Legacy codes of every planned student. */
export function plannedCodes(desired: readonly Desired[]): number[] {
  return desired.flatMap((d) => {
    const c = codeOf(d);
    return c === null ? [] : [c];
  });
}

export interface DropCodesInput {
  desired: readonly Desired[];
  existing: ReadonlyMap<string, Existing>;
  /** code_seq → id of the target student holding it. */
  holders: ReadonlyMap<number, string>;
}

/** Pure: the desired list with codes the student cannot have removed (rehashed), plus issues. */
export function dropTakenCodes(o: DropCodesInput): { desired: Desired[]; issues: RowIssue[] } {
  const issues: RowIssue[] = [];
  const desired = o.desired.map((d) => {
    const c = codeOf(d);
    if (c === null) return d;
    const self = o.existing.get(keyId(d.key))?.targetId;
    const holder = o.holders.get(c);
    // Fresh: dropped only when someone holds it. Imported earlier: kept only if it is its own.
    if (self ? holder === self : !holder) return d;
    const columns = { ...d.record.columns };
    delete columns['code_seq'];
    const record = { ...d.record, columns };
    issues.push({
      code: 'conflict',
      severity: self ? 'warn' : 'review',
      entity: 'students',
      ref: d.ref,
      field: 'legacy_code',
      detail: self
        ? `imported earlier without ${label(c)} (it was taken then); codes never change after insert`
        : `${label(c)} is already used by a student in the target; this student would get a new code (free ${label(c)} there first to keep it)`,
    });
    return { ...d, record, hash: recordHash(record) };
  });
  return { desired, issues };
}

export async function checkCodes(o: {
  db: TargetDb;
  desired: readonly Desired[];
  existing: ReadonlyMap<string, Existing>;
}): Promise<{ desired: Desired[]; issues: RowIssue[] }> {
  const codes = plannedCodes(o.desired);
  if (codes.length === 0) return { desired: [...o.desired], issues: [] };
  const rows = await o.db.select<{ id: string; code_seq: number }>({
    text: 'select id::text as id, code_seq::int as code_seq from public.students where code_seq = any($1)',
    params: [codes],
  });
  const holders = new Map(rows.map((r) => [Number(r.code_seq), r.id]));
  return dropTakenCodes({ ...o, holders });
}
