// In-import look-alikes that resolve() cannot see because their keys differ. Pure. Never merges:
// every hit is a review issue and both records are still planned (docs/06 step 4, issue A1).
import { arabicNameSimilar } from '@ab/shared';
import type { RowIssue } from '../../types.ts';
import type { Desired } from '../resolve.ts';

/** Student key 'phone|name' → [phone, name]. */
export function splitStudentKey(key: string): [string, string] {
  const i = key.indexOf('|');
  return i < 0 ? ['', key] : [key.slice(0, i), key.slice(i + 1)];
}

/** Students under one guardian whose names are similar but not equal (هاله ~ هاله محمد). */
export function similarStudents(desired: readonly Desired[]): RowIssue[] {
  const byGuardian = new Map<string, Desired[]>();
  for (const d of desired) {
    if (d.key.entity !== 'students') continue;
    const [phone] = splitStudentKey(d.key.key);
    byGuardian.set(phone, [...(byGuardian.get(phone) ?? []), d]);
  }
  const issues: RowIssue[] = [];
  for (const group of byGuardian.values()) {
    group.forEach((later, i) => {
      const [, name] = splitStudentKey(later.key.key);
      const twin = group
        .slice(0, i)
        .find((earlier) => arabicNameSimilar(splitStudentKey(earlier.key.key)[1], name));
      if (!twin) return;
      issues.push({
        code: 'merge_candidate',
        severity: 'review',
        entity: 'students',
        ref: later.ref,
        field: 'name',
        detail: `«${name}» ~ «${splitStudentKey(twin.key.key)[1]}» (${twin.ref.tab} row ${twin.ref.row}); both imported`,
      });
    });
  }
  return issues;
}

/** Two teacher records (different slugs) with one phone: likely one person under two names. */
export function samePhoneTeachers(desired: readonly Desired[]): RowIssue[] {
  const seen = new Map<string, Desired>();
  const issues: RowIssue[] = [];
  for (const d of desired) {
    const phone = d.key.entity === 'teachers' ? d.record.columns['phone_e164'] : null;
    if (typeof phone !== 'string' || !phone) continue;
    const first = seen.get(phone);
    if (!first) {
      seen.set(phone, d);
      continue;
    }
    issues.push({
      code: 'conflict',
      severity: 'review',
      entity: 'teachers',
      ref: d.ref,
      field: 'phone_e164',
      detail: `same phone as teacher ${first.key.key}`,
    });
  }
  return issues;
}
