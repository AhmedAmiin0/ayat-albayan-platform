import type { Attendance, Grade, LessonStatus, UserRole } from '@ab/catalog';
import { isClosedLesson, type StatusRouteEvent } from '@ab/schedule';
import { gradeStyle } from '@ab/money';

const MINUTE = 60_000;

/**
 * The six «تقييم البنود» rows of the «تقرير الحلقة» Google Form, in form order (R-REP-02).
 * Labels: ar.json reports.rubric.<key>. Columns: lesson_reports.grade_<key>.
 */
export const REPORT_RUBRICS = [
  'recitation',
  'memorization',
  'revision',
  'tajweed',
  'engagement',
  'commitment',
] as const;
export type Rubric = (typeof REPORT_RUBRICS)[number];

export const RUBRIC_COLUMN = {
  recitation: 'grade_recitation',
  memorization: 'grade_memorization',
  revision: 'grade_revision',
  tajweed: 'grade_tajweed',
  engagement: 'grade_engagement',
  commitment: 'grade_commitment',
} as const satisfies Record<Rubric, `grade_${string}`>;

/** Attendance in the report → the lesson outcome event (inverse of the API's outcomes.ts). */
export const ATTENDANCE_EVENT: Record<Attendance, StatusRouteEvent> = {
  on_time: 'complete',
  late: 'mark_late',
  excused: 'excuse',
  absent: 'mark_no_show',
};

/** The student was in the lesson, so the rubric grades and the overall grade are required. */
export function attended(attendance: Attendance): boolean {
  return attendance === 'on_time' || attendance === 'late';
}

/** Ordinal score for the progress chart (R-REP-05): the grade's pips, 5 = ممتاز … 1. */
export function gradeScore(grade: Grade | null): number | null {
  return grade === null ? null : gradeStyle[grade].pips;
}

export type ReportBlock = 'lesson_cancelled' | 'not_started';

/**
 * Can a report be submitted for this lesson now? (R-REP-02 "date not in future, not before lesson
 * date": the date is the lesson's own, prefilled, so it reduces to "the lesson has started".)
 * A cancelled or moved lesson has no report; drafts may be saved any time.
 */
export function reportBlock(input: {
  lessonStatus: LessonStatus;
  lessonStartsAt: Date;
  now: Date;
}): ReportBlock | null {
  if (isClosedLesson(input.lessonStatus)) return 'lesson_cancelled';
  if (input.now.getTime() < input.lessonStartsAt.getTime()) return 'not_started';
  return null;
}

export interface EditWindowInput {
  role: UserRole;
  /** First submit; null for a draft that was never submitted. */
  submittedAt: Date | null;
  /** lesson_reports.sent_at: once the family got it, the teacher's window is closed for good. */
  sentAt: Date | null;
  now: Date;
  /** settings.report_teacher_edit_minutes (30; 0 closes at once). Not the no-login link's hours. */
  minutes: number;
}

/** The teacher's rule: never once sent, else a draft any time or until submit + minutes. */
const teacherMayEdit = (input: EditWindowInput): boolean => {
  if (input.sentAt !== null) return false;
  const until = editUntil(input);
  return until === null || input.now.getTime() < until.getTime();
};

const EDIT_RULE: Partial<Record<UserRole, (input: EditWindowInput) => boolean>> = {
  admin: () => true,
  teacher: teacherMayEdit,
};

/**
 * R-REP-02: admins edit always; the report's teacher edits a draft any time and a submitted report
 * until `minutes` after its first submit (edits never extend it; the boundary instant is already
 * closed) and never once it was sent (owner 2026-11-11: raising the setting does not re-open a
 * sent report); guardians never.
 */
export function canEditReport(input: EditWindowInput): boolean {
  return EDIT_RULE[input.role]?.(input) ?? false;
}

/** End of the teacher's edit window; null while the report is a draft. */
export function editUntil(input: Pick<EditWindowInput, 'submittedAt' | 'minutes'>): Date | null {
  const at = input.submittedAt;
  return at === null ? null : new Date(at.getTime() + input.minutes * MINUTE);
}

export interface VersionState {
  version: number;
  submittedAt: Date | null;
}

/**
 * Columns written by a submit (R-REP-02 versioned, R-REP-04 one row, resubmit updates it):
 * every submit adds a version; the first sets submitted_at (the edit window anchor), later ones
 * keep it and set edited_at.
 */
export function nextVersion(
  current: VersionState,
  now: Date,
): { version: number; submittedAt: Date; editedAt: Date | null } {
  return {
    version: current.version + 1,
    submittedAt: current.submittedAt ?? now,
    editedAt: current.submittedAt === null ? null : now,
  };
}
