import { STUDENT_STATUSES, searchDigits, type StudentListFilters, type StudentStatus } from '@ab/shared';
import type { TeacherOption } from '@ab/shared';
import { NotFoundException } from '@nestjs/common';
import type { Db } from '@/common/db/db.module';
import { dbError, pageRange, type ListQuery } from '@/modules/people/guardians/http';
import { applySort } from '@/common/db/list-sort';
import { applyStudentFilters } from './students.filters';
import {
  studentNameOrCodeFilter,
  studentPhoneOrCodeFilter,
  toListItem,
  toProfile,
  type StudentListItem,
  type StudentListRow,
  type StudentProfile,
} from './students.mapper';
import {
  applyStudentColumnFilters,
  STUDENT_SORT,
  type StudentColumnFilters,
  type StudentListSort,
} from './students.sort';
import type { Page } from '@ab/shared';

// One literal each: supabase-js infers the row type from the select string.
const LIST_COLUMNS = `id, code, name, status, program, tz, created_at, package_remaining, has_weekly, guardian:guardians!inner(name, phone_e164), teacher:teachers(display_name_ar)`;
const PROFILE_COLUMNS = `*, guardian:guardians!inner(id, name, phone_e164, students(id, code, name, status), phones:guardian_phones(phone_e164, is_primary)), teacher:teachers(id, display_name_ar, display_name_en, meeting_link)`;

type StudentListQuery = ListQuery & StudentListFilters & StudentColumnFilters & StudentListSort;

/**
 * Paginated list (v_student_list), searchable by name / code / guardian phone and filtered by
 * status, teacher, program, package, weekly lesson, tz (R-STU-01), the column text filters and
 * an allowlisted sort, newest first by default (R-NFR-08).
 */
export async function listStudents(db: Db, q: StudentListQuery): Promise<Page<StudentListItem>> {
  const base = db.from('v_student_list').select(LIST_COLUMNS, { count: 'exact' });
  let query = applySort(applyStudentColumnFilters(applyStudentFilters(base, q), q), q, STUDENT_SORT);
  const filter = await searchFilter(db, q.search);
  if (filter) query = query.or(filter);
  const [from, to] = pageRange(q);
  // The view's columns read as nullable; the base columns (and has_weekly's exists) never are.
  const { data, error, count } = await query.range(from, to).overrideTypes<StudentListRow[], { merge: false }>();
  if (error) throw dbError(error);
  const tests = await testStudents(db, data.map((r) => r.id));
  const items = data.map((r) => ({ ...toListItem(r), is_test: tests.has(r.id) }));
  return { items, total: count ?? 0, page: q.page, pageSize: q.pageSize };
}

/** students.is_test (docs/56). */
async function testStudents(db: Db, ids: readonly string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data, error } = await db.from('students').select('id').in('id', ids).eq('is_test', true);
  if (error) throw dbError(error);
  return new Set(data.map((s) => s.id));
}

/**
 * Digits (searchDigits) → the students of guardians whose phone has them, or whose code has them
 * («0183» finds AB-0183); else the name or code.
 * ponytail: the first 100 matching guardians (the ids go into the URL); a digit run matching more
 * is not a real search.
 */
async function searchFilter(db: Db, term: string): Promise<string | null> {
  const digits = searchDigits(term);
  if (!digits) return studentNameOrCodeFilter(term);
  // Every family number, main and second (guardian_phones, owner 2026-10-29).
  const { data, error } = await db.from('guardian_phones').select('guardian_id').ilike('phone_e164', `%${digits}%`).limit(100);
  if (error) throw dbError(error);
  return studentPhoneOrCodeFilter([...new Set(data.map((g) => g.guardian_id))], digits);
}

type StatusCounts = Record<StudentStatus, number>;

/** Counts per status under the other filters. */
export async function countStudentsByStatus(db: Db, f: StudentListFilters): Promise<StatusCounts> {
  const rest: StudentListFilters = { ...f, status: undefined };
  const counts = await Promise.all(
    STUDENT_STATUSES.map(async (status) => {
      const base = db.from('v_student_list').select('id', { count: 'exact', head: true });
      const { error, count } = await applyStudentFilters(base, rest).eq('status', status);
      if (error) throw dbError(error);
      return [status, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(counts) as StatusCounts;
}

/** Profile with guardian (+ siblings) and teacher (R-STU-04, R-STU-05). */
export async function getStudentProfile(db: Db, id: string): Promise<StudentProfile> {
  const { data, error } = await db
    .from('students')
    .select(PROFILE_COLUMNS)
    .eq('id', id)
    // The family's numbers only: a student's own number (owner 2026-11-17) is not one.
    .is('guardian.phones.student_id', null)
    .maybeSingle();
  if (error) throw dbError(error);
  if (!data) throw new NotFoundException();
  return toProfile(data);
}


/** Active teachers for the profile's teacher picker. ponytail: move to teachers module later. */
export async function listTeacherOptions(db: Db): Promise<TeacherOption[]> {
  const { data, error } = await db
    .from('teachers')
    .select('id, display_name_ar, meeting_link')
    .eq('status', 'active')
    .order('display_name_ar');
  if (error) throw dbError(error);
  return data;
}
