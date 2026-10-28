import {
  attendanceKind,
  attendanceTableTotals,
  riyadhMonthBounds,
  riyadhMonthOf,
  type AttendanceTableRow,
  type StudentAttendanceTable,
} from '@ab/shared';
import { isTrialLesson } from '../../../finance/subscriptions';
import type { AttendanceLessonRow, AttendanceReportRow } from './student-attendance.queries';

const CANCELLED = new Set(['cancelled_by_teacher', 'cancelled_by_admin']);

/** The lessons read for a month: its Riyadh bounds, never past `now` (only lessons that started). */
export function attendanceWindow(month: string, now: Date): { from: Date; to: Date } {
  const { from, to } = riyadhMonthBounds(month);
  return { from, to: to.getTime() < now.getTime() ? to : now };
}

/** `reportId`: the student's submitted report of the lesson; `mine` decides whether its id leaves. */
function rowOf(l: AttendanceLessonRow, report: { reportId: string | null; mine: boolean }): AttendanceTableRow {
  const own = l.own[0];
  const attendance = own?.attendance ?? null;
  return {
    lesson_id: l.id,
    starts_at: new Date(l.starts_at).toISOString(),
    duration_min: Math.round((Date.parse(l.ends_at) - Date.parse(l.starts_at)) / 60_000),
    teacher_name: l.teacher?.display_name_ar ?? null,
    status: l.status,
    attendance,
    kind: attendanceKind(l.status, attendance),
    report_sent: report.reportId !== null,
    report_id: report.mine ? report.reportId : null,
    cancel_reason: CANCELLED.has(l.status) ? l.cancel_reason : null,
    is_trial: isTrialLesson(l, own?.chargeable ?? true),
    is_makeup: l.makeup_of_id !== null,
    is_rescheduled: l.rescheduled_from_id !== null,
  };
}

/** Every Riyadh month with a lesson that started, and the current one, newest first. */
export function monthsOf(starts: readonly string[], now: Date): string[] {
  const months = new Set([riyadhMonthOf(now), ...starts.map((s) => riyadhMonthOf(new Date(s)))]);
  return [...months].sort().reverse();
}

interface TableInput {
  month: string;
  lessons: readonly AttendanceLessonRow[];
  reports: readonly AttendanceReportRow[];
  starts: readonly string[];
  mine: boolean;
}

/** Whitelist of «سجل الحضور»: times, teacher, statuses, the cancel reason; never money, a link or notes. */
export function toAttendanceTable(input: TableInput, now: Date): StudentAttendanceTable {
  const reportOf = new Map(input.reports.map((r) => [r.lesson_id, r.id]));
  const past = input.lessons.filter((l) => Date.parse(l.starts_at) < now.getTime());
  const items = past.map((l) => rowOf(l, { reportId: reportOf.get(l.id) ?? null, mine: input.mine }));
  items.sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at));
  return { month: input.month, months: monthsOf(input.starts, now), items, totals: attendanceTableTotals(items), mine: input.mine };
}
