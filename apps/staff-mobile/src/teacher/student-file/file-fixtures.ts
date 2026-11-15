import type { AttendanceRowReport, StudentAttendanceTable, TeacherStudentHead } from '@ab/shared';
import { logRow, logTable } from '@/sales/sales/attendance/fixtures';

// The teacher's student file as the API answers it (tests only; sample names). The clock is
// 2026-11-11 12:00Z: the head's next 14 days, then November's log.

const sent = (over: Partial<AttendanceRowReport>): AttendanceRowReport => ({
  status: 'submitted',
  submitted_at: '2026-11-10T16:00:00Z',
  sent_at: null,
  can_edit: true,
  edit_until: '2026-11-11T12:30:00Z',
  ...over,
});
const open = { attendance: null, report_sent: false, report_id: null } as const;

export const head = (over: Partial<TeacherStudentHead> = {}): TeacherStudentHead => ({
  id: 's1',
  code: 'AB-0182',
  name: 'يوسف أحمد',
  status: 'active',
  course: {
    starts_on: '2026-10-01',
    stopped_at: null,
    ended_at: null,
    projected_end_at: null,
    lessons_total: 8,
    lessons_used: 5,
    lessons_remaining: 3,
  },
  upcoming: [
    logRow({ ...open, lesson_id: 'u1', starts_at: '2026-11-13T15:00:00Z', status: 'scheduled', kind: null }),
    logRow({
      ...open,
      lesson_id: 'u2',
      starts_at: '2026-11-15T15:00:00Z',
      status: 'rescheduled',
      kind: null,
      moved_to: '2026-11-16T15:00:00Z',
      move_reason: 'سفر الأسرة',
    }),
  ],
  ...over,
});

/** November: edit (window open), view (sent), write (no report), an admin's cancel, a move. */
export const fileLog = (over: Partial<StudentAttendanceTable> = {}): StudentAttendanceTable =>
  logTable({
    month: '2026-11',
    months: ['2026-11', '2026-10'],
    items: [
      logRow({ lesson_id: 'l-edit', starts_at: '2026-11-10T15:00:00Z', report: sent({}) }),
      logRow({
        lesson_id: 'l-view',
        starts_at: '2026-11-08T15:00:00Z',
        report: sent({ sent_at: '2026-11-08T17:00:00Z', can_edit: false }),
      }),
      logRow({ ...open, lesson_id: 'l-write', starts_at: '2026-11-06T15:00:00Z', report: null }),
      logRow({
        ...open,
        lesson_id: 'l-off',
        starts_at: '2026-11-04T15:00:00Z',
        status: 'cancelled_by_admin',
        kind: 'cancelled',
        cancel_reason: 'اعتذار الأسرة',
      }),
      logRow({
        lesson_id: 'l-moved',
        starts_at: '2026-11-02T15:00:00Z',
        is_rescheduled: true,
        moved_from: '2026-11-01T15:00:00Z',
        move_reason: 'مرض المعلمة',
        report: sent({ sent_at: '2026-11-02T17:00:00Z', can_edit: false }),
      }),
    ],
    ...over,
  });

const EMPTY_PAGE = { items: [], total: 0, page: 1, pageSize: 10, series: [] };
const ME = { id: 't-abrar', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [] };

/** apiFetch answers by path: /teachers/me, the head, the log, pending, the reports page. */
export function fileAnswers(over: { head?: TeacherStudentHead; pending?: unknown[] } = {}) {
  const answers: [(p: string) => boolean, () => unknown][] = [
    [(p) => p === '/teachers/me', () => ME],
    [(p) => p === '/teachers/me/students/s1', () => over.head ?? head()],
    [(p) => p.startsWith('/teachers/me/students/s1/attendance'), () => fileLog()],
    [(p) => p === '/teachers/me/pending-reports', () => over.pending ?? []],
  ];
  return async (p: string): Promise<unknown> =>
    (answers.find(([hit]) => hit(p))?.[1] ?? (() => EMPTY_PAGE))();
}
