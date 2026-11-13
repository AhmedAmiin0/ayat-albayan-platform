import { COUNTS_FOR_MONEY, type LessonStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';
import type {
  AttendanceLessonRow,
  AttendanceReportRow,
  AttendanceStudent,
  CoursePackageRow,
  TaughtQuery,
} from './student-attendance.rows';

/** [from, to); `teacherId` keeps one teacher's lessons only (her own «سجل الحضور», docs/46 C5). */
interface AttendanceWindow {
  from: Date;
  to: Date;
  teacherId?: string;
}

const LESSON_COLUMNS =
  'id, teacher_id, starts_at, ends_at, status, cancel_reason, rule_id, instant, makeup_of_id, ' +
  'rescheduled_from_id, time_edit_was';
/** Self-FK embeds as in lesson-row.ts: the replaced lesson and the lesson it moved to. */
const LESSON_EMBEDS =
  'moved_from:rescheduled_from_id(starts_at, cancel_reason, teacher_id), ' +
  'moved_to:lessons!rescheduled_from_id(starts_at), ' +
  'rule:schedule_rules!lessons_rule_id_fkey(package, ends_on, tz), ' +
  'teacher:teachers(display_name_ar), own:lesson_students!inner(student_id, attendance, chargeable)';
const LESSON_SELECT = `${LESSON_COLUMNS}, ${LESSON_EMBEDS}`;
/** Lessons she gave or will give: never moved away or cancelled (docs/47 gap 15). */
const TAUGHT = [
  'scheduled', 'confirmed', 'completed', 'late', 'no_show',
] as const satisfies readonly LessonStatus[];
const PACKAGE_SELECT =
  'id, starts_on, created_at, status, cancel_kind, cancelled_at, lessons_total' as const;

/** A month of one student's lessons is a few dozen; the months list reads starts only. */
const MONTH_LIMIT = 500;
const HISTORY_LIMIT = 5000;

/** «سجل الحضور» reads (service role; whitelisted columns, any student). */
@Injectable()
export class StudentAttendanceRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async exists(studentId: string): Promise<boolean> {
    const { data, error } = await this.db.from('students').select('id').eq('id', studentId).maybeSingle();
    if (error) throw dbError(error);
    return data !== null;
  }

  /** The student's lessons that started inside [from, to), newest first; `teacherId`: hers only. */
  async lessons(studentId: string, w: AttendanceWindow): Promise<AttendanceLessonRow[]> {
    const base = this.db.from('lessons').select(LESSON_SELECT).eq('own.student_id', studentId);
    const { data, error } = await (w.teacherId ? base.eq('teacher_id', w.teacherId) : base)
      .gte('starts_at', w.from.toISOString())
      .lt('starts_at', w.to.toISOString())
      .order('starts_at', { ascending: false })
      .limit(MONTH_LIMIT)
      .overrideTypes<AttendanceLessonRow[], { merge: false }>();
    if (error) throw dbError(error);
    return data;
  }

  /** When each of the student's lessons before `now` started (the month switcher), newest first. */
  async starts(studentId: string, now: Date, teacherId?: string): Promise<string[]> {
    const base = this.db
      .from('lessons')
      .select('starts_at, own:lesson_students!inner(student_id)')
      .eq('own.student_id', studentId);
    const { data, error } = await (teacherId ? base.eq('teacher_id', teacherId) : base)
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
      .select('id, lesson_id, submitted_at, sent_at')
      .eq('student_id', studentId)
      .eq('status', 'submitted')
      .in('lesson_id', [...lessonIds]);
    if (error) throw dbError(error);
    return data;
  }

  /** The file head (docs/47); null for an unknown id. */
  async student(id: string): Promise<AttendanceStudent | null> {
    const { data, error } = await this.db
      .from('students')
      .select('id, code, name, status')
      .eq('id', id)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** Whether she has a lesson with the student (TAUGHT) that starts at `since` or later. */
  async taughtBy(q: TaughtQuery): Promise<boolean> {
    const { data, error } = await this.db
      .from('lessons')
      .select('id, own:lesson_students!inner(student_id)')
      .eq('own.student_id', q.studentId)
      .eq('teacher_id', q.teacherId)
      .in('status', [...TAUGHT])
      .gte('starts_at', q.since.toISOString())
      .limit(1);
    if (error) throw dbError(error);
    return data.length > 0;
  }

  /** The student's packages that count (an unused cancel is out), newest first. */
  async packages(studentId: string): Promise<CoursePackageRow[]> {
    const { data, error } = await this.db
      .from('subscriptions')
      .select(PACKAGE_SELECT)
      .eq('student_id', studentId)
      .or(COUNTS_FOR_MONEY)
      .order('starts_on', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });
    if (error) throw dbError(error);
    return data;
  }
}
