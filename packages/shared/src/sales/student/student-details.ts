import { z } from 'zod';
import type { Attendance, LessonStatus, Program, StudentStatus } from '@ab/catalog';
import type { ReportSummaryView } from '../../reports';
import { instant } from '@ab/core';
import { moveReasonSchema } from '../../schemas';
import { isCancelledLesson } from '@ab/schedule';
import type { SalesHistoryEntry } from '../academy';
import type { SalesPackageSummary } from './student-package';
import type { SalesStudentSchedule } from './student-schedule';
import type { SalesStudentFamily } from './student-family';
import type { TrialOutcome } from '../../people/students';

// Student details for any student (docs/16 row 36); every assistant sees every student.

/** A subscription without its payments or audit trail: package, status, dates, lessons used / left. */
/** Sent only to self.sales_money holders and only when 0 < paid < price (docs/16 row 36). */
export interface SalesPartPaid {
  paid: number;
  price: number;
  due: number;
  currency: string;
}

export type SalesStudentSubscription = Omit<SalesHistoryEntry, 'payments' | 'status_changes'> & {
  part_paid?: SalesPartPaid;
};

/** One past lesson for this student, as the attendance list says it. */
export type AttendanceKind = 'present' | 'absent' | 'excused' | 'cancelled' | 'unmarked';

export interface SalesAttendanceDay {
  lesson_id: string;
  starts_at: string;
  kind: AttendanceKind;
}

/** A trial date a newer one replaced stays, with outcome `moved`. */
export interface SalesTrialLesson {
  lesson_id: string;
  starts_at: string;
  status: LessonStatus;
  outcome: TrialOutcome;
  teacher_name: string | null;
}

/** GET /sales/students/:id: 404 student_not_found for an unknown id only. */
export interface SalesStudentDetails {
  /** Hers, or any while SalesOwnershipRule does not enforce: the money actions. Every student reads the same. Absent: old cache (= hers). */
  mine?: boolean;
  student: {
    id: string;
    code: string;
    name: string;
    status: StudentStatus;
    program: Program;
    teacher_name: string | null;
    guardian_phone: string | null;
  };
  /** Newest first; `current_id` is the newest active one, else the newest (null without any). */
  subscriptions: SalesStudentSubscription[];
  current_id: string | null;
  /** The latest past lessons, newest first, and their totals per kind. */
  attendance: { items: SalesAttendanceDay[]; totals: Record<AttendanceKind, number> };
  /** The sent reports newest first, the teacher's rows (ReportSummaryView), and how many there are. */
  reports: { items: ReportSummaryView[]; total: number };
  /** Weekly slots and next lessons, no link; absent in an old cache. */
  schedule?: SalesStudentSchedule;
  /** Trial lessons newest first ([] without one); absent in an old cache. */
  trial?: SalesTrialLesson[];
  /**
   * The current package of ANY student: size, status, dates, lessons used /
   * left; never a price or payment. null: none. Absent in an old cache.
   */
  package?: SalesPackageSummary | null;
  /** The guardian's name and siblings; absent in an old cache. */
  family?: SalesStudentFamily;
}

/** POST /sales/lessons/:id/reschedule: one lesson only, no substitute teacher, no clash override. */
export const salesRescheduleSchema = z.strictObject({
  startsAt: instant,
  reason: moveReasonSchema,
});
/** Teacher or student cancels may come after the lesson ended and correct an auto-held one. */
export const salesCancelSchema = z.strictObject({
  reason: z.string().trim().max(500).optional(),
  by: z.enum(['admin', 'teacher', 'student']).optional(),
});
export type SalesReschedule = z.infer<typeof salesRescheduleSchema>;
export type SalesCancel = z.infer<typeof salesCancelSchema>;

/** What a sales reschedule answers: the new lesson's id, time and status (no admin LessonView). */
export interface SalesLessonMoved {
  id: string;
  starts_at: string;
  status: LessonStatus;
}

const HELD: readonly LessonStatus[] = ['completed', 'late'];

/** Own attendance wins, else the status; a rescheduled lesson is null, its new one counts. */
export function attendanceKind(
  status: LessonStatus,
  attendance: Attendance | null,
): AttendanceKind | null {
  if (status === 'rescheduled') return null;
  if (isCancelledLesson(status)) return 'cancelled';
  if (attendance === 'on_time' || attendance === 'late') return 'present';
  if (attendance === 'absent') return 'absent';
  if (attendance === 'excused') return 'excused';
  if (HELD.includes(status)) return 'present';
  if (status === 'no_show') return 'absent';
  return status === 'excused' ? 'excused' : 'unmarked';
}

const ZERO = (): Record<AttendanceKind, number> => ({
  present: 0,
  absent: 0,
  excused: 0,
  cancelled: 0,
  unmarked: 0,
});

/** How many days of each kind. */
export function attendanceTotals(
  days: readonly Pick<SalesAttendanceDay, 'kind'>[],
): Record<AttendanceKind, number> {
  const totals = ZERO();
  for (const d of days) totals[d.kind] += 1;
  return totals;
}
