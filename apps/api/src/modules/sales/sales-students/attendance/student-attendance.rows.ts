import type { Json, Tables } from '@ab/db';
import type { Attendance, LessonStatus, PackageSize, StudentStatus } from '@ab/shared';

// The rows StudentAttendanceRepo reads (whitelisted columns; docs/46 C5, docs/47).

/**
 * A lesson of the student in the month: never its meeting_link, notes or a price. `own` is the
 * student's row only.
 */
export interface AttendanceLessonRow {
  id: string;
  teacher_id: string;
  starts_at: string;
  ends_at: string;
  status: LessonStatus;
  cancel_reason: string | null;
  rule_id: string | null;
  instant: boolean;
  makeup_of_id: string | null;
  rescheduled_from_id: string | null;
  /** The last in-place time edit's old times (migration 174), unparsed. */
  time_edit_was: Json | null;
  /** The lesson this one replaced (a one-lesson move), and the one it moved to. */
  moved_from: { starts_at: string; cancel_reason: string | null; teacher_id: string } | null;
  moved_to: { starts_at: string }[];
  /** `ends_on` (a calendar day in `tz`): a series end or a course stop (docs/47). */
  rule: { package: PackageSize | null; ends_on: string | null; tz: string } | null;
  teacher: { display_name_ar: string } | null;
  own: { student_id: string; attendance: Attendance | null; chargeable: boolean }[];
}

/** A submitted report of the student: which lesson and when, nothing of its content. */
export interface AttendanceReportRow {
  id: string;
  lesson_id: string;
  submitted_at: string | null;
  sent_at: string | null;
}

/** The file head's student (docs/47): never notes, phones or a link. */
export interface AttendanceStudent {
  id: string;
  code: string | null;
  name: string;
  status: StudentStatus;
}

/** A package that counts (COUNTS_FOR_MONEY): dates and size only, never a price. */
export type CoursePackageRow = Pick<
  Tables<'subscriptions'>,
  'id' | 'starts_on' | 'created_at' | 'status' | 'cancel_kind' | 'cancelled_at' | 'lessons_total'
>;

/** One of her lessons with the student since `since` (TeacherStudentAccess). */
export interface TaughtQuery {
  teacherId: string;
  studentId: string;
  since: Date;
}
