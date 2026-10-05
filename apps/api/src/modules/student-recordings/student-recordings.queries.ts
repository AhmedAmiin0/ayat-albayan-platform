import type { StudentRecordingsQuery } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../teachers/http';
import { dayBounds, type RecordingJoinRow } from './student-recordings.mapper';

const SELECT =
  '*, lessons!inner(starts_at, teacher_id, teachers(id, display_name_ar), lesson_students!inner(student_id))';

export interface RecordingsPageInput {
  studentId: string;
  /** Only lessons this teacher taught (a teacher who does not have the student assigned); null = all. */
  onlyTeacherId: string | null;
  /** A finished, staff-approved recording only: what a guardian may ever read. */
  guardianView?: boolean;
  query: StudentRecordingsQuery;
}

/** The student file's recordings (service role; the services guard who may ask). */
@Injectable()
export class StudentRecordingQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async student(id: string): Promise<{ id: string; teacher_id: string | null } | null> {
    const { data, error } = await this.db.from('students').select('id, teacher_id').eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** Has this teacher taught a lesson this student attended? */
  async taughtBy(input: { teacherId: string; studentId: string }): Promise<boolean> {
    const { data, error } = await this.db
      .from('lesson_students')
      .select('lesson_id, lessons!inner(teacher_id)')
      .eq('student_id', input.studentId)
      .eq('lessons.teacher_id', input.teacherId)
      .limit(1);
    if (error) throw dbError(error);
    return data.length > 0;
  }

  async assists(input: { profileId: string; studentId: string }): Promise<boolean> {
    const { data, error } = await this.db
      .from('student_assistants')
      .select('student_id')
      .eq('profile_id', input.profileId)
      .eq('student_id', input.studentId)
      .maybeSingle();
    if (error) throw dbError(error);
    return data !== null;
  }

  /** The students whose guardian login this is. */
  async studentIdsOfGuardian(profileId: string): Promise<string[]> {
    const { data, error } = await this.db
      .from('students')
      .select('id, guardians!inner(profile_id)')
      .eq('guardians.profile_id', profileId);
    if (error) throw dbError(error);
    return data.map((s) => s.id);
  }

  /**
   * One page of the student's recordings, newest first. A group lesson's recording matches each
   * attending student: the join runs through lesson_students for THIS student only.
   */
  async page(input: RecordingsPageInput): Promise<{ rows: RecordingJoinRow[]; total: number }> {
    const { query } = input;
    const { gte, lt } = dayBounds(query);
    const from = (query.page - 1) * query.pageSize;
    let q = this.db
      .from('lesson_recordings')
      .select(SELECT, { count: 'exact' })
      .eq('lessons.lesson_students.student_id', input.studentId);
    if (input.onlyTeacherId) q = q.eq('lessons.teacher_id', input.onlyTeacherId);
    if (query.teacherId) q = q.eq('lessons.teacher_id', query.teacherId);
    if (gte) q = q.gte('lessons.starts_at', gte);
    if (lt) q = q.lt('lessons.starts_at', lt);
    if (input.guardianView) q = q.eq('visible_to_student', true).eq('status', 'done').is('deleted_at', null);
    const { data, error, count } = await q
      .order('started_at', { ascending: false })
      .range(from, from + query.pageSize - 1);
    if (error) throw dbError(error);
    return { rows: data, total: count ?? 0 };
  }
}
