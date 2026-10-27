import { z } from 'zod';
import type { Attendance, LessonStatus, Program, StudentStatus } from '../../enums/index.js';
import type { ReportSummaryView } from '../../reports/index.js';
import { instant } from '../../schemas/index.js';
import type { SalesHistoryEntry } from '../academy.js';
import type { SalesStudentSchedule } from './student-schedule.js';

// «تفاصيل الطالب» of the salesperson (owner 2026-10-27, docs/16 row 36): one of HER students (the
// ownership of «الاشتراكات»), its subscriptions, attendance and sent reports. Never a price or payment.

/** A subscription without its payments or audit trail: package, status, dates, lessons used / left. */
export type SalesStudentSubscription = Omit<SalesHistoryEntry, 'payments' | 'status_changes'>;

/** One past lesson for this student, as the attendance list says it. */
export type AttendanceKind = 'present' | 'absent' | 'excused' | 'cancelled' | 'unmarked';

export interface SalesAttendanceDay {
  lesson_id: string;
  starts_at: string;
  kind: AttendanceKind;
}

/** GET /sales/students/:id: 404 student_not_found for an unknown id AND for a student who is not hers. */
export interface SalesStudentDetails {
  student: { id: string; code: string; name: string; status: StudentStatus; program: Program; teacher_name: string | null; guardian_phone: string | null };
  /** Newest first; `current_id` is the newest active one, else the newest (null without any). */
  subscriptions: SalesStudentSubscription[];
  current_id: string | null;
  /** The latest past lessons, newest first, and their totals per kind. */
  attendance: { items: SalesAttendanceDay[]; totals: Record<AttendanceKind, number> };
  /** The sent reports newest first, the teacher's rows (ReportSummaryView), and how many there are. */
  reports: { items: ReportSummaryView[]; total: number };
  /** «الجدول»: weekly slots and the next lessons, no link. Absent in an old cache. */
  schedule?: SalesStudentSchedule;
}

/** POST /sales/lessons/:id/reschedule: one lesson only, no substitute teacher, no clash override. */
export const salesRescheduleSchema = z.strictObject({ startsAt: instant });
/** POST /sales/lessons/:id/cancel: one lesson only; the reason is optional for sales (null when absent). */
export const salesCancelSchema = z.strictObject({ reason: z.string().trim().max(500).optional() });
export type SalesReschedule = z.infer<typeof salesRescheduleSchema>;
export type SalesCancel = z.infer<typeof salesCancelSchema>;

/** What a sales reschedule answers: the new lesson's id, time and status (no admin LessonView). */
export interface SalesLessonMoved {
  id: string;
  starts_at: string;
  status: LessonStatus;
}

const HELD: readonly LessonStatus[] = ['completed', 'late'];
const CANCELLED: readonly LessonStatus[] = ['cancelled_by_teacher', 'cancelled_by_admin'];

/**
 * The student's own attendance wins (on time / late = حضر, absent = غاب, excused); without it the lesson's
 * status decides (held = حضر, no_show = غاب, excused, cancelled); an open lesson nobody marked is
 * «لم تُسجَّل». A moved lesson (rescheduled) is not a day of its own: null, its new lesson counts.
 */
export function attendanceKind(status: LessonStatus, attendance: Attendance | null): AttendanceKind | null {
  if (status === 'rescheduled') return null;
  if (CANCELLED.includes(status)) return 'cancelled';
  if (attendance === 'on_time' || attendance === 'late') return 'present';
  if (attendance === 'absent') return 'absent';
  if (attendance === 'excused') return 'excused';
  if (HELD.includes(status)) return 'present';
  if (status === 'no_show') return 'absent';
  return status === 'excused' ? 'excused' : 'unmarked';
}

const ZERO = (): Record<AttendanceKind, number> => ({ present: 0, absent: 0, excused: 0, cancelled: 0, unmarked: 0 });

/** How many days of each kind. */
export function attendanceTotals(days: readonly Pick<SalesAttendanceDay, 'kind'>[]): Record<AttendanceKind, number> {
  const totals = ZERO();
  for (const d of days) totals[d.kind] += 1;
  return totals;
}
