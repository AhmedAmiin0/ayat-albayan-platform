import type { Attendance, LessonStatus } from '@ab/shared';

const LESSON_COLUMNS =
  'id, rule_id, teacher_id, starts_at, ends_at, status, meeting_link, cancel_reason, override_reason, confirmed_at, rescheduled_from_id' as const;
const LESSON_EMBEDS =
  'teacher:teachers(id, display_name_ar, tz), lesson_students(student_id, attendance, chargeable, student:students(id, code, name, tz))' as const;

/** One select for every lesson view: the row, its teacher and its students. */
export const LESSON_SELECT = `${LESSON_COLUMNS}, ${LESSON_EMBEDS}` as const;

/** What LESSON_SELECT returns (structural, so fakes in tests stay small). */
export type LessonRow = {
  id: string;
  rule_id: string | null;
  teacher_id: string;
  starts_at: string;
  ends_at: string;
  status: LessonStatus;
  meeting_link: string | null;
  cancel_reason: string | null;
  override_reason: string | null;
  confirmed_at: string | null;
  rescheduled_from_id: string | null;
  teacher: { id: string; display_name_ar: string; tz: string } | null;
  lesson_students: {
    student_id: string;
    attendance: Attendance | null;
    chargeable: boolean;
    /** code is a generated column, typed nullable by the generator; never null in practice. */
    student: { id: string; code: string | null; name: string; tz: string } | null;
  }[];
};

export const studentIdsOf = (row: LessonRow): string[] => row.lesson_students.map((s) => s.student_id);
