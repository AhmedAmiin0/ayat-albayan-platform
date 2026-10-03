import type { Json } from '@ab/db';
import type { Attendance, LessonStatus, PackageSize } from '@ab/shared';

const LESSON_COLUMNS =
  'id, rule_id, teacher_id, starts_at, ends_at, status, meeting_link, cancel_reason, override_reason, confirmed_at, rescheduled_from_id, conflicts' as const;
const LESSON_EMBEDS =
  'teacher:teachers(id, display_name_ar, display_name_en, tz), rule:schedule_rules!lessons_rule_id_fkey(byday, package), lesson_students(student_id, attendance, chargeable, student:students(id, code, name, tz)), proposals:lesson_proposals!lesson_proposals_lesson_id_fkey(id, proposed_starts_at, note, status, created_at)' as const;

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
  /** Clashes stored when the daily job / extend generated it (Conflict[] as jsonb), or null. */
  conflicts: Json | null;
  teacher: { id: string; display_name_ar: string; display_name_en: string | null; tz: string } | null;
  /**
   * The weekly rule's days (a series reschedule keeps them, R-SCH-07) and package (R-SCH-09
   * «تجريبية»); optional in test fakes.
   */
  rule?: { byday: number[]; package?: PackageSize | null } | null;
  lesson_students: {
    student_id: string;
    attendance: Attendance | null;
    chargeable: boolean;
    /** code is a generated column, typed nullable by the generator; never null in practice. */
    student: { id: string; code: string | null; name: string; tz: string } | null;
  }[];
  /** The teacher's reschedule proposals (R-SCH-08); at most one is pending. */
  proposals: {
    id: string;
    proposed_starts_at: string;
    note: string | null;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
  }[];
};

export const studentIdsOf = (row: LessonRow): string[] => row.lesson_students.map((s) => s.student_id);
