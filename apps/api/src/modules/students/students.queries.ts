import { searchDigits } from '@ab/shared';
import { NotFoundException } from '@nestjs/common';
import type { Db } from '../../common/db/db.module';
import { dbError, pageRange, type ListQuery, type Page } from '../guardians/http';
import {
  studentNameOrCodeFilter,
  studentPhoneOrCodeFilter,
  toListItem,
  toProfile,
  type StudentListItem,
  type StudentProfile,
} from './students.mapper';

// One literal each: supabase-js infers the row type from the select string.
const LIST_COLUMNS = `id, code, name, status, program, tz, created_at, guardian:guardians!inner(name, phone_e164), teacher:teachers(display_name_ar)`;
const PROFILE_COLUMNS = `*, guardian:guardians!inner(id, name, phone_e164, students(id, code, name, status)), teacher:teachers(id, display_name_ar, meeting_link)`;

/** Paginated list, searchable by name / code / guardian phone (R-STU-01, R-NFR-08). */
export async function listStudents(db: Db, q: ListQuery): Promise<Page<StudentListItem>> {
  let query = db
    .from('students')
    .select(LIST_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false });
  const filter = await searchFilter(db, q.search);
  if (filter) query = query.or(filter);
  const [from, to] = pageRange(q);
  const { data, error, count } = await query.range(from, to);
  if (error) throw dbError(error);
  return { items: data.map(toListItem), total: count ?? 0, page: q.page, pageSize: q.pageSize };
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
  const { data, error } = await db.from('guardians').select('id').ilike('phone_e164', `%${digits}%`).limit(100);
  if (error) throw dbError(error);
  return studentPhoneOrCodeFilter(data.map((g) => g.id), digits);
}

/** Profile with guardian (+ siblings) and teacher (R-STU-04, R-STU-05). */
export async function getStudentProfile(db: Db, id: string): Promise<StudentProfile> {
  const { data, error } = await db
    .from('students')
    .select(PROFILE_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw dbError(error);
  if (!data) throw new NotFoundException();
  return toProfile(data);
}

export type TeacherOption = { id: string; display_name_ar: string; meeting_link: string | null };

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
