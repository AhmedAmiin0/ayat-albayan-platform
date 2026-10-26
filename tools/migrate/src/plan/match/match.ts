// Target-side resolve (pure): planned records vs rows the app created before the import.
// Teachers: phone, else normalised Arabic name. Students: same guardian + exact normalised name.
// A match is adopted (import_items row only, nothing overwritten); a match by name alone is
// listed for the owner (merge_candidate warn: every imported lesson and report will hang off that
// row). Similar-but-not-equal names and rows already claimed by another record go to review.
import { arabicNameSimilar } from '@ab/shared';
import { keyId, personName } from '../../keys.ts';
import type { RowIssue } from '../../types.ts';
import type { Desired } from '../resolve.ts';
import { splitStudentKey } from './similar.ts';

export interface TeacherRow {
  id: string;
  phone_e164: string | null;
  display_name_ar: string;
}

export interface StudentRow {
  id: string;
  guardian_id: string;
  name: string;
  code: string;
}

export interface MatchResult {
  /** keyId → target id to adopt. */
  adopt: Map<string, string>;
  issues: RowIssue[];
}

interface MatchInput<R> {
  /** Records not yet in import_items (the caller filters). */
  fresh: readonly Desired[];
  rows: readonly R[];
  /** Target ids already taken by import_items or an earlier adoption. */
  claimed: Set<string>;
}

interface Claim {
  d: Desired;
  id: string;
  claimed: Set<string>;
  /** How the target row was found: a name-only match is shown to the owner. */
  by: 'phone' | 'name';
}

function claim(o: Claim, out: MatchResult): void {
  if (o.claimed.has(o.id)) {
    out.issues.push({
      code: 'conflict',
      severity: 'review',
      entity: o.d.key.entity,
      ref: o.d.ref,
      detail: `matches target row ${o.id}, already linked to another import record; created new`,
    });
    return;
  }
  o.claimed.add(o.id);
  out.adopt.set(keyId(o.d.key), o.id);
  if (o.by === 'name')
    out.issues.push({
      code: 'merge_candidate',
      severity: 'warn',
      entity: o.d.key.entity,
      ref: o.d.ref,
      field: 'name',
      detail: `adopted target row ${o.id} by exact name: imported rows link to it`,
    });
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

export function matchTeachers(input: MatchInput<TeacherRow>): MatchResult {
  const out: MatchResult = { adopt: new Map(), issues: [] };
  for (const d of input.fresh) {
    if (d.key.entity !== 'teachers') continue;
    const phone = str(d.record.columns['phone_e164']);
    const name = personName(str(d.record.columns['display_name_ar']));
    const byPhone = phone ? input.rows.find((r) => r.phone_e164 === phone) : undefined;
    const byName = name
      ? input.rows.find((r) => personName(r.display_name_ar) === name)
      : undefined;
    const row = byPhone ?? byName;
    if (row) claim({ d, id: row.id, claimed: input.claimed, by: byPhone ? 'phone' : 'name' }, out);
  }
  return out;
}

export interface StudentMatchInput extends MatchInput<StudentRow> {
  /** guardian keyId → target guardian id (imported earlier or adopted). */
  guardianIds: ReadonlyMap<string, string>;
}

export function matchStudents(input: StudentMatchInput): MatchResult {
  const out: MatchResult = { adopt: new Map(), issues: [] };
  for (const d of input.fresh) {
    const g = d.key.entity === 'students' ? d.record.refs['guardian_id'] : undefined;
    const gid = g && input.guardianIds.get(keyId(g));
    if (!gid) continue;
    const [, name] = splitStudentKey(d.key.key);
    const siblings = input.rows.filter((r) => r.guardian_id === gid);
    const exact = siblings.find((r) => personName(r.name) === name);
    if (exact) {
      claim({ d, id: exact.id, claimed: input.claimed, by: 'name' }, out);
      continue;
    }
    const similar = siblings.filter((r) => arabicNameSimilar(personName(r.name), name));
    if (similar.length === 0) continue;
    out.issues.push({
      code: 'merge_candidate',
      severity: 'review',
      entity: 'students',
      ref: d.ref,
      field: 'name',
      detail: `«${name}» ~ existing ${similar.map((r) => `${r.code} «${r.name}»`).join(', ')}; created new`,
    });
  }
  return out;
}
