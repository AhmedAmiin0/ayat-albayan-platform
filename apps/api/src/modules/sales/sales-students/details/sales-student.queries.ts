import type { Tables } from '@ab/db';
import type { Attendance, LessonStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { dbError } from '../../../../common/http/http';

/** Whitelisted: never notes, a balance, a guardian contact or a meeting link. */
export type DetailsStudentRow = Pick<Tables<'students'>, 'id' | 'code' | 'name' | 'status' | 'program'> & {
  teacher: { display_name_ar: string } | null;
};

/** A past lesson of the student with every student's attendance (the mapper keeps the student's own). */
export interface AttendanceRow {
  id: string;
  starts_at: string;
  status: LessonStatus;
  lesson_students: { student_id: string; attendance: Attendance | null }[];
}

/** What a sales move / cancel checks: who is in the lesson and when it ends. */
export interface LessonFacts {
  id: string;
  starts_at: string;
  ends_at: string;
  status: LessonStatus;
  lesson_students: { student_id: string }[];
}

/** The latest past lessons shown in «الحضور». */
const ATTENDANCE_LIMIT = 60;

/** Sales' «تفاصيل الطالب» and lesson actions reads (service role; SalesStudentScope checks the ownership first). */
@Injectable()
export class SalesStudentQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async student(id: string): Promise<DetailsStudentRow | null> {
    const { data, error } = await this.db
      .from('students')
      .select('id, code, name, status, program, teacher:teachers(display_name_ar)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** Lessons of the student that started before `now`, newest first, at most ATTENDANCE_LIMIT. */
  async pastLessons(studentId: string, now: Date): Promise<AttendanceRow[]> {
    const { data, error } = await this.db
      .from('lessons')
      .select('id, starts_at, status, lesson_students!inner(student_id, attendance)')
      .eq('lesson_students.student_id', studentId)
      .lt('starts_at', now.toISOString())
      .order('starts_at', { ascending: false })
      .limit(ATTENDANCE_LIMIT)
      .overrideTypes<AttendanceRow[], { merge: false }>();
    if (error) throw dbError(error);
    return data;
  }

  async lesson(id: string): Promise<LessonFacts | null> {
    const { data, error } = await this.db
      .from('lessons')
      .select('id, starts_at, ends_at, status, lesson_students(student_id)')
      .eq('id', id)
      .maybeSingle<LessonFacts>();
    if (error) throw dbError(error);
    return data;
  }
}
