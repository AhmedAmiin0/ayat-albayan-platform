import type { AttendanceTableRow, StudentAttendanceTable } from '@ab/shared';

// «سجل الحضور» as the API answers it (tests only; sample names).

export const logRow = (over: Partial<AttendanceTableRow> = {}): AttendanceTableRow => ({
  lesson_id: 'l1',
  starts_at: '2026-10-27T15:00:00.000Z',
  duration_min: 30,
  teacher_name: 'أبرار محمد',
  status: 'completed',
  attendance: 'on_time',
  kind: 'present',
  report_sent: true,
  report_id: 'rep1',
  cancel_reason: null,
  is_trial: false,
  is_makeup: false,
  is_rescheduled: false,
  ...over,
});

/** October: attended (report sent), late makeup, a teacher's cancellation with its reason; mine. */
export const logTable = (over: Partial<StudentAttendanceTable> = {}): StudentAttendanceTable => ({
  month: '2026-10',
  months: ['2026-10', '2026-09'],
  items: [
    logRow(),
    logRow({ lesson_id: 'l2', starts_at: '2026-10-25T15:00:00.000Z', attendance: 'late', report_sent: false, report_id: null, is_makeup: true }),
    logRow({ lesson_id: 'l3', starts_at: '2026-10-20T15:00:00.000Z', status: 'cancelled_by_teacher', attendance: null, kind: 'cancelled', report_sent: false, report_id: null, cancel_reason: 'سفر المعلمة' }),
  ],
  totals: { held: 2, late: 1, absent: 0, excused: 0, cancelled_by_teacher: 1, cancelled_by_admin: 0, rescheduled: 0, unmarked: 0 },
  mine: true,
  ...over,
});
