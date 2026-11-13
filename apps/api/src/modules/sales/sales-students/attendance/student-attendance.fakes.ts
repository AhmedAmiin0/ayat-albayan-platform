// «سجل الحضور» rows as the database could return them, secrets present (test-only, *.fakes.ts).
import type { Mock } from 'vitest';
import type { AttendanceLessonRow } from './student-attendance.rows';

export const STUDENT = '51000000-0000-4000-8000-0000000000a1';
/** Her teachers row (the teacher reader's lessons). */
export const TEACHER_ROW = '7e000000-0000-4000-8000-000000000001';
/** A package rule with no last day yet. */
const RULE = { package: '8', ends_on: null, tz: 'Asia/Riyadh' } as const;
/** Wed 28 Oct 2026, 13:00 Riyadh. */
export const NOW = new Date('2026-10-28T10:00:00Z');

type Over = Partial<AttendanceLessonRow> & { attendance?: AttendanceLessonRow['own'][number]['attendance'] };

/** A 30-minute package lesson with Abrar; a link, notes and a price ride along and must never leave. */
export function lessonRow(id: string, starts_at: string, over: Over = {}): AttendanceLessonRow & { meeting_link: string; notes: string; price: number } {
  const { attendance = null, ...rest } = over;
  const ends = new Date(Date.parse(starts_at) + 30 * 60_000).toISOString();
  return {
    id, teacher_id: TEACHER_ROW, starts_at, ends_at: ends, status: 'completed', cancel_reason: null,
    rule_id: 'r1', instant: false, makeup_of_id: null, rescheduled_from_id: null,
    time_edit_was: null, moved_from: null, moved_to: [], rule: RULE,
    teacher: { display_name_ar: 'أبرار' }, own: [{ student_id: STUDENT, attendance, chargeable: true }],
    meeting_link: 'https://meet/secret', notes: 'سر', price: 290, ...rest,
  };
}

/** Where the 'moved' lesson went. */
export const MOVED_TO = '2026-10-07T15:00:00+00:00';

/** The held lesson's report: submitted at its end, never sent to the family. */
export const HELD_REPORT = {
  id: 'rep-held', lesson_id: 'held', submitted_at: '2026-10-27T15:30:00+00:00', sent_at: null,
};

/** October in Riyadh: one of each kind, one still ahead (left out), newest first. */
export const octoberLessons = (): AttendanceLessonRow[] => [
  lessonRow('future', '2026-10-29T15:00:00+00:00', { status: 'scheduled' }),
  lessonRow('held', '2026-10-27T15:00:00+00:00', { attendance: 'on_time' }),
  lessonRow('late', '2026-10-25T15:00:00+00:00', { attendance: 'late', makeup_of_id: 'held0' }),
  lessonRow('absent', '2026-10-20T15:00:00+00:00', { status: 'no_show' }),
  lessonRow('excused', '2026-10-18T15:00:00+00:00', { status: 'excused', attendance: 'excused' }),
  lessonRow('byTeacher', '2026-10-13T15:00:00+00:00', { status: 'cancelled_by_teacher', cancel_reason: 'سفر المعلمة' }),
  lessonRow('byAdmin', '2026-10-11T15:00:00+00:00', { status: 'cancelled_by_admin', cancel_reason: 'عطلة' }),
  lessonRow('moved', '2026-10-06T15:00:00+00:00', {
    status: 'rescheduled', cancel_reason: 'طلب الأسرة', moved_to: [{ starts_at: MOVED_TO }],
  }),
  lessonRow('trial', '2026-09-30T21:30:00+00:00', { rule: { ...RULE, package: 'trial' }, rescheduled_from_id: 'moved0', attendance: 'on_time' }),
];

interface AttendanceFake {
  exists: Mock;
  lessons: Mock;
  starts: Mock;
  reports: Mock;
  student: Mock;
  taughtBy: Mock;
  packages: Mock;
}

export const STUDENT_HEAD = { id: STUDENT, code: 'AB-0101', name: 'ياسمين', status: 'active' } as const;

export function resetAttendance(q: AttendanceFake): void {
  q.exists.mockImplementation(async (id: string) => id === STUDENT);
  q.lessons.mockResolvedValue(octoberLessons());
  q.starts.mockResolvedValue(['2026-10-27T15:00:00+00:00', '2026-09-30T20:00:00+00:00', '2026-08-01T10:00:00+00:00']);
  q.reports.mockResolvedValue([HELD_REPORT]);
  q.student.mockImplementation(async (id: string) => (id === STUDENT ? { ...STUDENT_HEAD } : null));
  q.taughtBy.mockResolvedValue(false);
  q.packages.mockResolvedValue([]);
}
