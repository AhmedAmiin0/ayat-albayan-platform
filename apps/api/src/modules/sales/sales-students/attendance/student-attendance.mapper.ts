import {
  attendanceKind,
  attendanceTableTotals,
  monthRangeIn,
  RIYADH_TZ,
  teacherAttendanceKind,
  zonedPartsIn,
  type AttendanceTableRow,
  type StudentAttendanceTable,
} from '@ab/shared';
import { isTrialLesson } from '@/modules/finance/subscriptions';
import type { AttendanceLessonRow, AttendanceReportRow } from './student-attendance.repo';


/** Whose reading of a row: staff (attendanceKind) or the teacher (auto-held = unmarked). */
type AttendanceReader = 'staff' | 'teacher';
const KIND_OF = { staff: attendanceKind, teacher: teacherAttendanceKind } as const;
/** Whose cancel reasons a reader sees: the teacher never the admin's (docs/46 C5). */
const REASON_OF: Record<AttendanceReader, ReadonlySet<string>> = {
  staff: new Set(['cancelled_by_teacher', 'cancelled_by_admin']),
  teacher: new Set(['cancelled_by_teacher']),
};

/** "YYYY-MM" of an instant in a zone (Riyadh for staff, the teacher's own zone for her). */
export const monthIn = (at: Date, tz: string): string => zonedPartsIn(at, tz).date.slice(0, 7);

/** The lessons read for a month: its bounds in `tz`, never past `now` (only started lessons). */
export function attendanceWindow(
  month: string,
  now: Date,
  tz: string = RIYADH_TZ,
): { from: Date; to: Date } {
  const { from, to } = monthRangeIn(month, tz);
  return { from, to: to.getTime() < now.getTime() ? to : now };
}

/** `reportId`: the student's submitted report of the lesson; it opens for any student (2026-10-30). */
interface RowOptions {
  reportId: string | null;
  reader: AttendanceReader;
}

function rowOf(l: AttendanceLessonRow, o: RowOptions): AttendanceTableRow {
  const own = l.own[0];
  const attendance = own?.attendance ?? null;
  return {
    lesson_id: l.id,
    starts_at: new Date(l.starts_at).toISOString(),
    duration_min: Math.round((Date.parse(l.ends_at) - Date.parse(l.starts_at)) / 60_000),
    teacher_name: l.teacher?.display_name_ar ?? null,
    status: l.status,
    attendance,
    kind: KIND_OF[o.reader](l.status, attendance),
    report_sent: o.reportId !== null,
    report_id: o.reportId,
    cancel_reason: REASON_OF[o.reader].has(l.status) ? l.cancel_reason : null,
    is_trial: isTrialLesson(l, own?.chargeable ?? true),
    is_makeup: l.makeup_of_id !== null,
    is_rescheduled: l.rescheduled_from_id !== null,
  };
}

/** Every month (in `tz`) with a lesson that started, and the current one, newest first. */
export function monthsOf(starts: readonly string[], now: Date, tz: string = RIYADH_TZ): string[] {
  const months = new Set([monthIn(now, tz), ...starts.map((s) => monthIn(new Date(s), tz))]);
  return [...months].sort().reverse();
}

interface TableInput {
  month: string;
  lessons: readonly AttendanceLessonRow[];
  reports: readonly AttendanceReportRow[];
  starts: readonly string[];
  mine: boolean;
  /** Default: Riyadh, staff (the admin's and sales' table). */
  tz?: string;
  reader?: AttendanceReader;
}

/** The teacher's totals count an auto-held lesson (unmarked) as unmarked, never held. */
const forTotals = (row: AttendanceTableRow): Pick<AttendanceTableRow, 'status' | 'attendance'> =>
  row.kind === 'unmarked' ? { status: 'scheduled', attendance: null } : row;

/** Whitelist of «سجل الحضور»: times, teacher, statuses, the cancel reason; never money or a link. */
export function toAttendanceTable(input: TableInput, now: Date): StudentAttendanceTable {
  const { tz = RIYADH_TZ, reader = 'staff' } = input;
  const reportOf = new Map(input.reports.map((r) => [r.lesson_id, r.id]));
  const past = input.lessons.filter((l) => Date.parse(l.starts_at) < now.getTime());
  const items = past.map((l) => rowOf(l, { reportId: reportOf.get(l.id) ?? null, reader }));
  items.sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at));
  const totals = attendanceTableTotals(items.map(forTotals));
  const months = monthsOf(input.starts, now, tz);
  return { month: input.month, months, items, totals, mine: input.mine };
}
