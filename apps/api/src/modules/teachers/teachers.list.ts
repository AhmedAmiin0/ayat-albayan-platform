import { searchDigits, type ListSort, type Program, type TEACHER_SORT_KEYS, type TeacherStatus } from '@ab/shared';
import { ilikeContains, type SortSpec } from '../../common/list-sort';
import type { PageQuery } from './http';

type TeacherSortKey = (typeof TEACHER_SORT_KEYS)[number];

/** GET /teachers query (R-TCH-01, R-NFR-08): search, column filters, allowlisted sort. */
export type TeacherListQuery = PageQuery &
  ListSort<TeacherSortKey> & {
    search?: string | undefined;
    name?: string | undefined;
    phone?: string | undefined;
    programs?: Program | undefined;
    status?: TeacherStatus | undefined;
  };

/** Sort key → teachers column; the Arabic name is the default order (`id` breaks ties after it). */
export const TEACHER_SORT: SortSpec<TeacherSortKey> = {
  columns: {
    name: { column: 'display_name_ar' },
    programs: { column: 'programs' },
    phone: { column: 'phone_e164', nullsFirst: false },
    max_students: { column: 'max_students' },
    status: { column: 'status' },
  },
  fallback: { column: 'display_name_ar', ascending: true },
};

export interface TeacherFilterable<Q> {
  ilike(column: string, pattern: string): Q;
  eq(column: string, value: string): Q;
  contains(column: string, value: string[]): Q;
}

/** Name «contains», phone digits in any format «contains», one program among hers, status. */
export function applyTeacherFilters<Q extends TeacherFilterable<Q>>(query: Q, f: TeacherListQuery): Q {
  let q = query;
  if (f.name) q = q.ilike('display_name_ar', ilikeContains(f.name));
  if (f.phone) q = q.ilike('phone_e164', ilikeContains(searchDigits(f.phone) || f.phone));
  if (f.programs) q = q.contains('programs', [f.programs]);
  if (f.status) q = q.eq('status', f.status);
  return q;
}
