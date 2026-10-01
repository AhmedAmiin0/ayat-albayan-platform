import { NotFoundException } from '@nestjs/common';
import type { Db } from '../../common/db/db.module';
import { phoneSearchDigits } from '../guardians/guardians.mapper';
import { dbError, pageRange, type ListQuery, type Page } from '../guardians/http';
import {
  studentNameOrCodeFilter,
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
  const digits = phoneSearchDigits(q.search);
  const nameOrCode = studentNameOrCodeFilter(q.search);
  if (digits) query = query.ilike('guardian.phone_e164', `%${digits}%`);
  else if (nameOrCode) query = query.or(nameOrCode);
  const [from, to] = pageRange(q);
  const { data, error, count } = await query.range(from, to);
  if (error) throw dbError(error);
  return { items: data.map(toListItem), total: count ?? 0, page: q.page, pageSize: q.pageSize };
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
