import type { AttendanceTableRow, StudentAttendanceTable } from '@ab/shared';

/** Ids are uuids: the client checks the answer against the route's response schema. */
export const lessonId = (n: number): string => `00000000-0000-4000-8000-00000000000${n}`;
export const REPORT_ID = '00000000-0000-4000-8000-0000000000a1';

export const logRow = (over: Partial<AttendanceTableRow> = {}): AttendanceTableRow => ({
  lesson_id: lessonId(1),
  starts_at: '2026-10-27T15:00:00.000Z',
  duration_min: 30,
  teacher_name: 'أبرار محمد',
  status: 'completed',
  attendance: 'on_time',
  kind: 'present',
  report_sent: true,
  report_id: REPORT_ID,
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
    logRow({ lesson_id: lessonId(2), starts_at: '2026-10-25T15:00:00.000Z', attendance: 'late', report_sent: false, report_id: null, is_makeup: true }),
    logRow({ lesson_id: lessonId(3), starts_at: '2026-10-20T15:00:00.000Z', status: 'cancelled_by_teacher', attendance: null, kind: 'cancelled', report_sent: false, report_id: null, cancel_reason: 'سفر المعلمة' }),
  ],
  totals: {
    held: 2,
    late: 1,
    absent: 0,
    excused: 0,
    cancelled_by_teacher: 1,
    cancelled_by_admin: 0,
    rescheduled: 0,
    unmarked: 0,
  },
  mine: true,
  ...over,
});
