import type { AttendanceRowReport, StudentAttendanceTable, TeacherStudentHead } from '@ab/shared';
import { logRow, logTable } from '@/sales/sales/attendance/fixtures';

// The teacher's student file as the API answers it (tests only; sample names). The clock is
// 2026-11-11 12:00Z: the head's next 14 days, then November's log.

const uuid = (n: number): string => `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

/** Lesson ids as the API sends them (uuids). */
export const LESSON = {
  u1: uuid(1),
  u2: uuid(2),
  edit: uuid(3),
  view: uuid(4),
  write: uuid(5),
  off: uuid(6),
  moved: uuid(7),
} as const;
const REPORT_ID = uuid(9);
/** The student the screen opens (its route id). */
export const STUDENT_ID = uuid(8);

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
  id: STUDENT_ID,
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
    logRow({ ...open, lesson_id: LESSON.u1, starts_at: '2026-11-13T15:00:00Z', status: 'scheduled', kind: null }),
    logRow({
      ...open,
      lesson_id: LESSON.u2,
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
      logRow({
        lesson_id: LESSON.edit,
        report_id: REPORT_ID,
        starts_at: '2026-11-10T15:00:00Z',
        report: sent({}),
      }),
      logRow({
        lesson_id: LESSON.view,
        report_id: REPORT_ID,
        starts_at: '2026-11-08T15:00:00Z',
        report: sent({ sent_at: '2026-11-08T17:00:00Z', can_edit: false }),
      }),
      logRow({ ...open, lesson_id: LESSON.write, starts_at: '2026-11-06T15:00:00Z', report: null }),
      logRow({
        ...open,
        lesson_id: LESSON.off,
        starts_at: '2026-11-04T15:00:00Z',
        status: 'cancelled_by_admin',
        kind: 'cancelled',
        cancel_reason: 'اعتذار الأسرة',
      }),
      logRow({
        lesson_id: LESSON.moved,
        report_id: REPORT_ID,
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
    [(p) => p === `/teachers/me/students/${STUDENT_ID}`, () => over.head ?? head()],
    [(p) => p.startsWith(`/teachers/me/students/${STUDENT_ID}/attendance`), () => fileLog()],
    [(p) => p === '/teachers/me/pending-reports', () => over.pending ?? []],
  ];
  return async (p: string): Promise<unknown> =>
    (answers.find(([hit]) => hit(p))?.[1] ?? (() => EMPTY_PAGE))();
}
