import { normalizeArabic, type ListSort, type StudentSortKey } from '@ab/shared';
import { ilikeContains, type SortSpec } from '@/common/db/list-sort';

/** Column text filters of GET /students (R-NFR-08), beside the select filters of R-STU-01. */
export type StudentColumnFilters = { code?: string | undefined; name?: string | undefined; guardian?: string | undefined };
export type StudentListSort = ListSort<StudentSortKey>;

/**
 * Sort key → v_student_list column. Guardian and teacher are to-one embeds: PostgREST orders the
 * parent rows by `embed(column)` (a `referencedTable` option would only order inside the embed).
 */
export const STUDENT_SORT: SortSpec<StudentSortKey> = {
  columns: {
    code: { column: 'code' },
    name: { column: 'name_normalized' },
    guardian: { column: 'guardian(name)' },
    program: { column: 'program' },
    teacher: { column: 'teacher(display_name_ar)', nullsFirst: false },
    status: { column: 'status' },
    remaining: { column: 'package_remaining', nullsFirst: false },
    weekly: { column: 'has_weekly' },
  },
  fallback: { column: 'created_at', ascending: false },
};

interface IlikeQuery<Q> {
  ilike(column: string, pattern: string): Q;
}

/**
 * Code «contains», name «contains» on the Arabic-normalised name (سهيله finds سهيلة), guardian
 * name «contains»: guardians is an !inner embed, so its filter drops the student row.
 */
export function applyStudentColumnFilters<Q extends IlikeQuery<Q>>(query: Q, f: StudentColumnFilters): Q {
  let q = query;
  if (f.code) q = q.ilike('code', ilikeContains(f.code));
  if (f.name) q = q.ilike('name_normalized', ilikeContains(normalizeArabic(f.name)));
  if (f.guardian) q = q.ilike('guardian.name', ilikeContains(f.guardian));
  return q;
}
