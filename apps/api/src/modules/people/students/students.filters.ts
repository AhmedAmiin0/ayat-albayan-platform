import { NO_TEACHER, type StudentListFilters, type StudentPackageFilter } from '@ab/shared';

/**
 * The few supabase-js filter methods the list uses. Every filter is a single eq/in/is on a column
 * of v_student_list, so none of them stacks a second or=() on top of the search's.
 */
export interface FilterableQuery<Q> {
  eq(column: string, value: string | boolean): Q;
  in(column: string, values: readonly string[]): Q;
  is(column: string, value: null): Q;
}

/** «الباقة» → the boolean column of v_student_list and the value it must have. */
const PACKAGE_COLUMN: Record<StudentPackageFilter, [string, boolean]> = {
  active: ['has_package', true],
  none: ['has_package', false],
  low: ['low_balance', true],
  unpaid: ['package_unpaid', true],
};

/** Applies the list filters (R-STU-01) to a v_student_list query; unset filters are skipped. */
export function applyStudentFilters<Q extends FilterableQuery<Q>>(query: Q, f: StudentListFilters): Q {
  let q = query;
  if (f.status?.length) q = q.in('status', f.status);
  if (f.teacher === NO_TEACHER) q = q.is('teacher_id', null);
  else if (f.teacher) q = q.eq('teacher_id', f.teacher);
  if (f.program) q = q.eq('program', f.program);
  if (f.package) q = q.eq(...PACKAGE_COLUMN[f.package]);
  if (f.weekly) q = q.eq('has_weekly', f.weekly === 'yes');
  if (f.tz) q = q.eq('tz', f.tz);
  return q;
}
