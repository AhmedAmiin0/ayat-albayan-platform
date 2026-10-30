import { z } from 'zod';
import type { Attendance, LessonStatus, Program, StudentStatus } from '../../enums/index.js';
import type { ReportSummaryView } from '../../reports/index.js';
import { instant } from '../../schemas/index.js';
import type { SalesHistoryEntry } from '../academy.js';
import type { SalesPackageSummary } from './student-package.js';
import type { SalesStudentSchedule } from './student-schedule.js';
import type { TrialOutcome } from '../../people/students/index.js';

// «تفاصيل الطالب» of the salesperson (docs/16 row 36): ANY student (owner 2026-10-28), its trial,
// «الجدول» and attendance; subscriptions and sent reports only for HER students (`mine`). Never a price or payment.

/** A subscription without its payments or audit trail: package, status, dates, lessons used / left. */
/**
 * «مدفوعة جزئيًا: 80 من 81 ر.س · الباقي 1» (owner 2026-10-28): net paid, price and what is left, in the
 * package currency. Sent ONLY to a viewer holding self.sales_money (she sees these in her money views
 * already) and only when 0 < paid < price; otherwise absent (docs/16 row 36 stays: no price for the rest).
 */
export interface SalesPartPaid {
  paid: number;
  price: number;
  due: number;
  currency: string;
}

export type SalesStudentSubscription = Omit<SalesHistoryEntry, 'payments' | 'status_changes'> & { part_paid?: SalesPartPaid };

/** One past lesson for this student, as the attendance list says it. */
export type AttendanceKind = 'present' | 'absent' | 'excused' | 'cancelled' | 'unmarked';

export interface SalesAttendanceDay {
  lesson_id: string;
  starts_at: string;
  kind: AttendanceKind;
}

/** One trial lesson of «الحلقة التجريبية»: a date «موعد تجريبي جديد» replaced stays, outcome `moved`. */
export interface SalesTrialLesson {
  lesson_id: string;
  starts_at: string;
  status: LessonStatus;
  /** trialOutcome of «مواعيد الحلقة التجريبية»: قادمة / بانتظار التقرير / حضر / غاب / أُلغيت / نُقلت. */
  outcome: TrialOutcome;
  teacher_name: string | null;
}

/** GET /sales/students/:id: 404 student_not_found for an unknown id only. */
export interface SalesStudentDetails {
  /** Hers (SalesQueries.ownership). Not hers: no subscriptions, no reports, no lesson actions. Absent in an old cache (= hers). */
  mine?: boolean;
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
  /** «الحلقة التجريبية»: the trial lessons newest first ([] without one). Absent in an old cache. */
  trial?: SalesTrialLesson[];
  /**
   * The current package of ANY student (owner 2026-10-30): size, status, dates, lessons used /
   * left; never a price or payment. null: none. Absent in an old cache.
   */
  package?: SalesPackageSummary | null;
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
