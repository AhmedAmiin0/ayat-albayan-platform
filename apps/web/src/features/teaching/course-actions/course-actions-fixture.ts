import type { BookingTeacherOption, BookedCourse, ProfileCourseView } from '@ab/shared';
import type { Mock } from 'vitest';

// Test data only: the profile course actions (owner 2026-10-30). Now is Saturday 3 October 2026,
// 12:00 Riyadh; the course runs Sunday 17:00 and Wednesday 19:30 (Riyadh).

export const NOW = '2026-10-03T09:00:00.000Z';
export const SUN = '2026-10-04T14:00:00.000Z';
export const WED = '2026-10-07T16:30:00.000Z';
export const MON = '2026-10-05T15:00:00.000Z';
export const SUB = '7d3c2b1a-0f9e-4d8c-8b7a-6a5b4c3d2e1f';
export const OLD_T = '1a000000-0000-4000-8000-000000000001';
export const NEW_T = '1a000000-0000-4000-8000-000000000002';

const COURSE: BookedCourse = {
  days: [
    { weekday: 0, startTimeLocal: '17:00' },
    { weekday: 3, startTimeLocal: '19:30' },
  ],
  perWeek: 2,
  lessonsTotal: 8,
  subscriptionId: SUB,
  teacherId: OLD_T,
  teacherTz: 'Asia/Riyadh',
  tz: 'Asia/Riyadh',
  durationMin: 45,
  running: true,
  startsOn: '2026-09-06',
  opensOn: '2026-10-03',
  endsOn: '2026-10-28',
};

export const VIEW: ProfileCourseView = {
  student: { id: 's1', name: 'سهيلة', code: 'AB-0183', tz: 'Asia/Riyadh' },
  course: COURSE,
  nextLesson: { startsOn: '2026-10-04', startsAt: SUN },
};

const teacher = (id: string, name: string): BookingTeacherOption => ({
  id,
  display_name_ar: name,
  gender: 'female',
  programs: ['quran'],
  tz: 'Asia/Riyadh',
  meeting_link: null,
  platform_classroom: false,
  students_count: 3,
  max_students: null,
  has_availability: true,
});

export const TEACHERS = [teacher(OLD_T, 'أبرار'), teacher(NEW_T, 'مريم')];
export const CHECK = { conflicts: [], remaining: 5, endsOn: '2026-10-21' };

/** apiFetch: the profile's course view, the teachers and the free slots (Sun, Mon, Wed). */
export function routeCourse(apiFetch: Mock): void {
  const slots = {
    teacher_tz: 'Asia/Riyadh',
    step_min: 45,
    slots: [SUN, MON, WED].map((at) => ({ starts_at: at, ends_at: at, conflicts: [] })),
  };
  apiFetch.mockImplementation((path: string) => {
    if (path.includes('/change?subscriptionId=')) return Promise.resolve(VIEW);
    if (path.endsWith('/course-teacher/teachers')) return Promise.resolve(TEACHERS);
    if (path.includes('/booking/slots')) return Promise.resolve(slots);
    return Promise.reject(new Error(`unmocked ${path}`));
  });
}

/** apiSend: …/change/check answers CHECK, …/change the next answer (an Error rejects). */
export function routeSend(apiSend: Mock, answers: unknown[] = []): void {
  apiSend.mockImplementation((_m: string, path: string) => {
    if (path.endsWith('/change/check')) return Promise.resolve(CHECK);
    const answer = answers.shift() ?? {
      subscriptionId: SUB,
      ruleIds: ['r-9'],
      endsOn: CHECK.endsOn,
    };
    return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
  });
}
