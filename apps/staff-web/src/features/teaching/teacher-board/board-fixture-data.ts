import { lessonWhenAt, type TeacherMe } from '@ab/shared';
import { lesson, SUHAILA } from '@/features/teaching/schedule/lesson/lesson-fixture';

// Test data (not a test): five students (one paused) and three lessons for the board tests.

export const TZ = 'Africa/Cairo';
type Status = TeacherMe['students'][number]['status'];
export const kid = (id: string, name: string, status: Status) => ({
  id, code: `AB-${id}`, name, tz: TZ, status,
});
export const ME: TeacherMe = {
  id: 't-abrar', display_name_ar: 'أبرار', gender: 'female', programs: ['quran'], tz: TZ,
  meeting_link: null, meeting_mode: null, platform_classroom: false,
  students: [
    kid('s-1', 'سهيلة', 'active'),
    kid('s-2', 'جود', 'trial'),
    kid('s-3', 'ريم', 'paused'),
    kid('s-4', 'مريم', 'pending_renewal'),
    kid('s-5', 'هند', 'expired'),
  ],
};
export const NOW = new Date('2026-10-05T12:00:00.000Z');
const REPORT = { id: 'r-a', status: 'submitted' as const };
const OWN = { ...SUHAILA, attendance: 'on_time' as const, report: REPORT };
export const PAST = lesson({ id: 'a', starts_at: '2026-10-01T13:00:00.000Z', status: 'completed', students: [OWN] });
export const MISSED = lesson({ id: 'b', starts_at: '2026-10-03T13:00:00.000Z', status: 'no_show' });
export const NEXT = lesson({ id: 'c', starts_at: '2026-10-07T13:00:00.000Z' });
export const when = (iso: string) => lessonWhenAt(new Date(iso), { tz: TZ, locale: 'ar', cycle: '24' });

/** GET /teachers/me/students?kind= answers: program · level · age per student. */
export const FACTS = (path: string) =>
  Promise.resolve(path.endsWith('kind=trial')
    ? [{ id: 's-2', code: 'AB-s-2', name: 'جود', status: 'trial', program: 'arabic', level: null, age: 2, next_lesson_at: null }]
    : [{ id: 's-1', code: 'AB-s-1', name: 'سهيلة', status: 'active', program: 'quran', level: 'جزء عمّ', age: 9, next_lesson_at: null }]);

