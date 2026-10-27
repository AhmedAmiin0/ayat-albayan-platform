import type { Tables } from '@ab/db';
import { OPEN_LESSON_STATUSES, type Attendance, type LessonStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { dbError } from '../../../../common/http/http';
import type { SalesScheduleRow } from '../../sales';

/** Whitelisted: never notes, a balance or a meeting link; of the guardian the phone only (owner 2026-10-27). */
export type DetailsStudentRow = Pick<Tables<'students'>, 'id' | 'code' | 'name' | 'status' | 'program' | 'tz'> & {
  teacher: { display_name_ar: string } | null;
  guardian: { phone_e164: string } | null;
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

/** An active rule of the student: never its meeting_link, subscription or creator. */
export type WeeklyRuleRow = Pick<
  Tables<'schedule_rules'>,
  'id' | 'byday' | 'start_time_local' | 'tz' | 'duration_min' | 'package' | 'starts_on' | 'ends_on' | 'status'
> & { teacher: { display_name_ar: string; display_name_en: string | null } | null };

/**
 * The sales schedule's whitelist (SalesScheduleRow) without the way in: no meeting_link, no meeting_mode.
 * `own` keeps only the student's lessons; `lesson_students` still lists every student (for `mine`).
 */
const UPCOMING_SELECT =
  'id, starts_at, ends_at, status, makeup_of_id, rule:schedule_rules!lessons_rule_id_fkey(package), teacher:teachers(id, display_name_ar, display_name_en, tz), own:lesson_students!inner(student_id), lesson_students(student:students(id, code, name, tz))' as const;

const RULE_SELECT =
  'rule:schedule_rules!inner(id, byday, start_time_local, tz, duration_min, package, starts_on, ends_on, status, teacher:teachers(display_name_ar, display_name_en))' as const;

interface Window {
  from: Date;
  to: Date;
  limit: number;
}

/** The latest past lessons shown in «الحضور». */
const ATTENDANCE_LIMIT = 60;

/** Sales' «تفاصيل الطالب» (with «الجدول») and lesson actions reads (service role; SalesStudentScope checks the ownership first). */
@Injectable()
export class SalesStudentQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async student(id: string): Promise<DetailsStudentRow | null> {
    const { data, error } = await this.db
      .from('students')
      .select('id, code, name, status, program, tz, teacher:teachers(display_name_ar), guardian:guardians(phone_e164)')
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

  /** The student's active rules (schedule_rule_students → schedule_rules.status = 'active'). */
  async rules(studentId: string): Promise<WeeklyRuleRow[]> {
    const { data, error } = await this.db
      .from('schedule_rule_students')
      .select(RULE_SELECT)
      .eq('student_id', studentId)
      .eq('rule.status', 'active');
    if (error) throw dbError(error);
    return data.map((r) => r.rule);
  }

  /** The student's open lessons (scheduled / confirmed) starting inside [from, to), by start, at most `limit`. */
  async upcoming(studentId: string, w: Window): Promise<SalesScheduleRow[]> {
    const { data, error } = await this.db
      .from('lessons')
      .select(UPCOMING_SELECT)
      .eq('own.student_id', studentId)
      .gte('starts_at', w.from.toISOString())
      .lt('starts_at', w.to.toISOString())
      .in('status', [...OPEN_LESSON_STATUSES])
      .order('starts_at')
      .limit(w.limit)
      .overrideTypes<SalesScheduleRow[], { merge: false }>();
    if (error) throw dbError(error);
    return data;
  }
}
