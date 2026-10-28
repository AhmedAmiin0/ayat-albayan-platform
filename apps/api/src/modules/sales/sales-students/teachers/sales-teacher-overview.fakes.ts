// One teacher's «الجدول» / «الحضور» rows as the database could return them, secrets present (test-only, *.fakes.ts).
import type { Mock } from 'vitest';
import type { TeacherLessonRow, TeacherRuleRow } from './sales-teacher-overview.queries';

export const TEACHER = '7c000000-0000-4000-8000-0000000000e1';
export const NOW = new Date('2026-10-28T10:00:00Z');

/** Sun, Tue 19:00 Cairo (20:00 Riyadh) with two students, a link and a price that must never leave. */
export const teacherRule = (over: Partial<TeacherRuleRow> = {}): TeacherRuleRow & { meeting_link: string; price: number } => ({
  id: 'r1', byday: [2, 0], start_time_local: '19:00:00', tz: 'Africa/Cairo', duration_min: 45, package: '8', starts_on: '2026-01-01', ends_on: null,
  students: [{ student: { name: 'ياسمين', code: 'AB-0101' } }, { student: { name: 'يوسف', code: null } }], meeting_link: 'https://meet/secret', price: 290, ...over,
});

export const teacherLesson = (id: string, starts_at: string, status: TeacherLessonRow['status']): TeacherLessonRow => ({
  id, starts_at, status, lesson_students: [{ student: { name: 'ياسمين', code: 'AB-0101' } }],
});

/** Five past lessons of the last month: held, late, absent, cancelled by the teacher, moved. */
export const teacherLessons = (): TeacherLessonRow[] => [
  teacherLesson('a', '2026-10-27T17:00:00+00:00', 'completed'),
  teacherLesson('b', '2026-10-25T17:00:00+00:00', 'late'),
  teacherLesson('c', '2026-10-20T17:00:00+00:00', 'no_show'),
  teacherLesson('d', '2026-10-18T17:00:00+00:00', 'cancelled_by_teacher'),
  teacherLesson('e', '2026-10-13T17:00:00+00:00', 'rescheduled'),
];

export function resetOverview(o: { exists: Mock; rules: Mock; lessons: Mock }): void {
  o.exists.mockImplementation(async (id: string) => id === TEACHER);
  o.rules.mockResolvedValue([teacherRule(), teacherRule({ id: 'rt', package: 'trial', byday: [3] })]);
  o.lessons.mockResolvedValue(teacherLessons());
}
