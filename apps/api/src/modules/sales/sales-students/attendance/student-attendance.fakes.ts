// «سجل الحضور» rows as the database could return them, secrets present (test-only, *.fakes.ts).
import type { Mock } from 'vitest';
import type { AttendanceLessonRow } from './student-attendance.queries';

export const STUDENT = '51000000-0000-4000-8000-0000000000a1';
/** Wed 28 Oct 2026, 13:00 Riyadh. */
export const NOW = new Date('2026-10-28T10:00:00Z');

type Over = Partial<AttendanceLessonRow> & { attendance?: AttendanceLessonRow['own'][number]['attendance'] };

/** A 30-minute package lesson with Abrar; a link, notes and a price ride along and must never leave. */
export function lessonRow(id: string, starts_at: string, over: Over = {}): AttendanceLessonRow & { meeting_link: string; notes: string; price: number } {
  const { attendance = null, ...rest } = over;
  const ends = new Date(Date.parse(starts_at) + 30 * 60_000).toISOString();
  return {
    id, starts_at, ends_at: ends, status: 'completed', cancel_reason: null, rule_id: 'r1', instant: false, makeup_of_id: null, rescheduled_from_id: null,
    rule: { package: '8' }, teacher: { display_name_ar: 'أبرار' }, own: [{ student_id: STUDENT, attendance, chargeable: true }],
    meeting_link: 'https://meet/secret', notes: 'سر', price: 290, ...rest,
  };
}

/** October in Riyadh: one of each kind, one still ahead (left out), newest first. */
export const octoberLessons = (): AttendanceLessonRow[] => [
  lessonRow('future', '2026-10-29T15:00:00+00:00', { status: 'scheduled' }),
  lessonRow('held', '2026-10-27T15:00:00+00:00', { attendance: 'on_time' }),
  lessonRow('late', '2026-10-25T15:00:00+00:00', { attendance: 'late', makeup_of_id: 'held0' }),
  lessonRow('absent', '2026-10-20T15:00:00+00:00', { status: 'no_show' }),
  lessonRow('excused', '2026-10-18T15:00:00+00:00', { status: 'excused', attendance: 'excused' }),
  lessonRow('byTeacher', '2026-10-13T15:00:00+00:00', { status: 'cancelled_by_teacher', cancel_reason: 'سفر المعلمة' }),
  lessonRow('byAdmin', '2026-10-11T15:00:00+00:00', { status: 'cancelled_by_admin', cancel_reason: 'عطلة' }),
  lessonRow('moved', '2026-10-06T15:00:00+00:00', { status: 'rescheduled', cancel_reason: 'ignored' }),
  lessonRow('trial', '2026-09-30T21:30:00+00:00', { rule: { package: 'trial' }, rescheduled_from_id: 'moved0', attendance: 'on_time' }),
];

export function resetAttendance(q: { exists: Mock; lessons: Mock; starts: Mock; reports: Mock }): void {
  q.exists.mockImplementation(async (id: string) => id === STUDENT);
  q.lessons.mockResolvedValue(octoberLessons());
  q.starts.mockResolvedValue(['2026-10-27T15:00:00+00:00', '2026-09-30T20:00:00+00:00', '2026-08-01T10:00:00+00:00']);
  q.reports.mockResolvedValue([{ id: 'rep-held', lesson_id: 'held' }]);
}
