import type { Tables } from '@ab/db';
import { OPEN_LESSON_STATUSES, type SalesStudentsQuery } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { studentNameOrCodeFilter } from '../students/students.mapper';
import { dbError } from '../teachers/http';

type Student = Pick<Tables<'students'>, 'id' | 'code' | 'name' | 'status' | 'program'>;

/**
 * Whitelisted teacher columns: never rates, phone, calendar or load. The fixed meeting link is the one
 * exception (owner 2026-10-12, docs/16 rows 3 and 10): «رابط الحلقة الثابت» in «المعلمون» only.
 */
export type SalesTeacherRow = Pick<Tables<'teachers'>, 'id' | 'display_name_ar' | 'display_name_en' | 'gender' | 'programs' | 'meeting_link'> & {
  students: Student[];
};

export type SalesStudentRow = Pick<Tables<'students'>, 'id' | 'code' | 'name' | 'status' | 'program'> & {
  guardian: { name: string } | null;
  teacher: { display_name_ar: string } | null;
};

export interface SalesLiveRow {
  id: string;
  starts_at: string;
  ends_at: string;
  status: Tables<'lessons'>['status'];
  teacher: { display_name_ar: string } | null;
  lesson_students: { student: { name: string } | null }[];
}

/**
 * The salesperson's assistant side (docs/16), read with the service role: the academy's teachers,
 * every student and the lessons running now. Each select is a whitelist; the mappers whitelist again.
 */
@Injectable()
export class SalesAcademyQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async teachers(): Promise<SalesTeacherRow[]> {
    const { data, error } = await this.db
      .from('teachers')
      .select('id, display_name_ar, display_name_en, gender, programs, meeting_link, students(id, code, name, status, program)')
      .eq('status', 'active')
      .order('display_name_ar');
    if (error) throw dbError(error);
    return data;
  }

  /** One page by name; `search` is a name (Arabic-normalised) or a code, like the admin's list. */
  async students(q: SalesStudentsQuery): Promise<{ rows: SalesStudentRow[]; total: number }> {
    let query = this.db
      .from('students')
      .select('id, code, name, status, program, guardian:guardians(name), teacher:teachers(display_name_ar)', { count: 'exact' })
      .order('name');
    const filter = q.search ? studentNameOrCodeFilter(q.search) : null;
    if (filter) query = query.or(filter);
    const from = (q.page - 1) * q.pageSize;
    const { data, error, count } = await query.range(from, from + q.pageSize - 1);
    if (error) throw dbError(error);
    return { rows: data, total: count ?? 0 };
  }

  /** Lessons with starts_at <= now < ends_at that are still open (scheduled / confirmed), by start. */
  async live(now: Date): Promise<SalesLiveRow[]> {
    const at = now.toISOString();
    const { data, error } = await this.db
      .from('lessons')
      .select('id, starts_at, ends_at, status, teacher:teachers(display_name_ar), lesson_students(student:students(name))')
      .lte('starts_at', at)
      .gt('ends_at', at)
      .in('status', [...OPEN_LESSON_STATUSES])
      .order('starts_at');
    if (error) throw dbError(error);
    return data;
  }
}
