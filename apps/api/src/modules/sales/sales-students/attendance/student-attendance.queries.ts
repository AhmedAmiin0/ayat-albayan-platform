import type { Attendance, LessonStatus, PackageSize } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { dbError } from '../../../../common/http/http';

/** A lesson of the student in the month: never its meeting_link, notes or a price. `own` is the student's row only. */
export interface AttendanceLessonRow {
  id: string;
  starts_at: string;
  ends_at: string;
  status: LessonStatus;
  cancel_reason: string | null;
  rule_id: string | null;
  instant: boolean;
  makeup_of_id: string | null;
  rescheduled_from_id: string | null;
  rule: { package: PackageSize | null } | null;
  teacher: { display_name_ar: string } | null;
  own: { student_id: string; attendance: Attendance | null; chargeable: boolean }[];
}

/** A submitted report of the student: which lesson, nothing of its content. */
export interface AttendanceReportRow {
  id: string;
  lesson_id: string;
}

const LESSON_SELECT =
  'id, starts_at, ends_at, status, cancel_reason, rule_id, instant, makeup_of_id, rescheduled_from_id, rule:schedule_rules!lessons_rule_id_fkey(package), teacher:teachers(display_name_ar), own:lesson_students!inner(student_id, attendance, chargeable)' as const;

/** A month of one student's lessons is a few dozen; the months list reads starts only. */
const MONTH_LIMIT = 500;
const HISTORY_LIMIT = 5000;

/** «سجل الحضور» reads (service role; whitelisted columns, any student). */
@Injectable()
export class StudentAttendanceQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async exists(studentId: string): Promise<boolean> {
    const { data, error } = await this.db.from('students').select('id').eq('id', studentId).maybeSingle();
    if (error) throw dbError(error);
    return data !== null;
  }

  /** The student's lessons that started inside [from, to), newest first. */
  async lessons(studentId: string, w: { from: Date; to: Date }): Promise<AttendanceLessonRow[]> {
    const { data, error } = await this.db
      .from('lessons')
      .select(LESSON_SELECT)
      .eq('own.student_id', studentId)
      .gte('starts_at', w.from.toISOString())
      .lt('starts_at', w.to.toISOString())
      .order('starts_at', { ascending: false })
      .limit(MONTH_LIMIT)
      .overrideTypes<AttendanceLessonRow[], { merge: false }>();
    if (error) throw dbError(error);
    return data;
  }

  /** When each of the student's lessons before `now` started (for the month switcher), newest first. */
  async starts(studentId: string, now: Date): Promise<string[]> {
    const { data, error } = await this.db
      .from('lessons')
      .select('starts_at, own:lesson_students!inner(student_id)')
      .eq('own.student_id', studentId)
      .lt('starts_at', now.toISOString())
      .order('starts_at', { ascending: false })
      .limit(HISTORY_LIMIT);
    if (error) throw dbError(error);
    return data.map((r) => r.starts_at);
  }

  /** The student's submitted reports of these lessons. */
  async reports(studentId: string, lessonIds: readonly string[]): Promise<AttendanceReportRow[]> {
    if (lessonIds.length === 0) return [];
    const { data, error } = await this.db
      .from('lesson_reports')
      .select('id, lesson_id')
      .eq('student_id', studentId)
      .eq('status', 'submitted')
      .in('lesson_id', [...lessonIds]);
    if (error) throw dbError(error);
    return data;
  }
}
