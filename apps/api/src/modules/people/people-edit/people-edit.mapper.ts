import type { Json, TablesInsert } from '@ab/db';
import { normalizeArabic, type PeopleEditView } from '@ab/shared';
import type { GuardianRow, ViewRow } from './people-edit.repo';

type Family = NonNullable<ViewRow['guardian']>;

/** GET /people/students/:id: the edit forms' data; the login only as a yes / no. */
export function toEditView(row: ViewRow, family: Family): PeopleEditView {
  // `guardian` is replaced by the checked `family`; dropped by the rest spread.
  const { profile_id, guardian, ...student } = row;
  return { student: { ...student, has_login: profile_id !== null }, guardian: family };
}

/** The audit snapshot of the fields a request named: { before, after } of those keys only. */
export function changedFields<R extends Record<string, Json | undefined>>(
  rows: { before: R; after: R },
  keys: readonly string[],
): { before: Json; after: Json } {
  const pick = (row: R): Json => Object.fromEntries(keys.map((k) => [k, row[k] ?? null]));
  return { before: pick(rows.before), after: pick(rows.after) };
}

/**
 * «تحويل إلى طالب»: the guardian who is really the learner becomes a student of their own family,
 * whose number is theirs (contact_is_self). Status and program take the DB defaults, as any new
 * registration; created_by attributes it like a registration by the same account
 * (students_brought_guard).
 */
export function selfStudentInsert(guardian: GuardianRow, actorId: string) {
  const row: TablesInsert<'students'> = {
    guardian_id: guardian.id,
    name: guardian.name,
    name_normalized: normalizeArabic(guardian.name),
    tz: guardian.tz,
    contact_is_self: true,
    created_by: actorId,
  };
  return row;
}
