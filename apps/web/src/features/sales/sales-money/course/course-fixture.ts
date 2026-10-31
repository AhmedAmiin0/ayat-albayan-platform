import type { BookedCourse, CourseSubscription, SalesCourseView } from '@ab/shared';
import type { Mock } from 'vitest';
import { ABRAR, SLOT, WED_SLOT } from '@/features/teaching/booking/wizard-fixture';

// Test data only: GET /sales/booking/course and the sales wizard's reads (owner 2026-10-18).

export const COURSE_STUDENT_ID = '0b6a7c1e-2222-4a8e-9b00-000000000002';

export const COURSE_SUB: CourseSubscription = { id: 'sub-1', package: '8', duration: 45, lessons_total: 8, starts_on: '2026-10-03' };

export const COURSE_VIEW: SalesCourseView = {
  student: {
    id: COURSE_STUDENT_ID,
    code: 'AB-0183',
    name: 'سهيلة',
    tz: 'Asia/Riyadh',
    program: 'quran',
    teacher_gender_pref: 'female',
    teacher_id: ABRAR.id,
  },
  subscription: COURSE_SUB,
  perWeek: 2,
  blocked: null,
};

export const BOOKED = {
  rule_id: 'r1',
  student_ids: [COURSE_STUDENT_ID],
  guardian_ids: ['g1'],
  lessons: [{ id: 'l1', starts_at: SLOT, ends_at: SLOT }],
  message_ids: [],
};

/** apiFetch for the course dialog: the view, her teachers (ABRAR) and two free slots (Sun 17:00, Wed 19:30). */
export function routeCourse(apiFetch: Mock, view: SalesCourseView = COURSE_VIEW): void {
  const routes: [string, unknown][] = [
    ['/sales/booking/course', view],
    ['/sales/booking/teachers', [ABRAR]],
    ['/sales/booking/slots', { teacher_tz: 'Africa/Cairo', step_min: 45, slots: [SLOT, WED_SLOT].map((at) => ({ starts_at: at, ends_at: at, conflicts: [] })) }],
  ];
  apiFetch.mockImplementation((path: string) => {
    const hit = routes.find(([prefix]) => path.startsWith(prefix));
    return hit ? Promise.resolve(hit[1]) : Promise.reject(new Error(`unmocked ${path}`));
  });
}

/** apiSend: the series check answers `check` (clean by default), the booking BOOKED. */
export function routeCourseSend(apiSend: Mock, check: unknown = { conflicts: [] }): void {
  apiSend.mockImplementation((_m: string, path: string) => Promise.resolve(path === '/sales/booking/check' ? check : BOOKED));
}

// A renewal (owner 2026-10-18): the previous course ran Sunday 17:00 + Wednesday 19:30 until Saturday
// 10 October, so the new one opens on Sunday 11 October with the same days prefilled.
export const PREVIOUS: BookedCourse = {
  subscriptionId: 'sub-0',
  teacherId: ABRAR.id,
  teacherTz: 'Africa/Cairo',
  durationMin: 45,
  tz: 'Asia/Riyadh',
  startsOn: '2026-09-13',
  endsOn: '2026-10-10',
  running: true,
  opensOn: '2026-10-03',
  days: [
    { weekday: 0, startTimeLocal: '17:00' },
    { weekday: 3, startTimeLocal: '19:30' },
  ],
  lessonsTotal: 8,
  perWeek: 2,
};
export const RENEWAL_VIEW: SalesCourseView = { ...COURSE_VIEW, previous: PREVIOUS, student: { ...COURSE_VIEW.student, teacher_id: null } };
export const NEXT_SUN = '2026-10-11T14:00:00.000Z'; // Sunday 17:00 Riyadh
export const NEXT_SUN_LATER = '2026-10-11T15:00:00.000Z'; // Sunday 18:00
export const NEXT_WED = '2026-10-14T16:30:00.000Z'; // Wednesday 19:30

/** apiFetch for a renewal: the view, her teachers (ABRAR by default), and the week of 10 October's free slots. */
export function routeRenewal(apiFetch: Mock, view: SalesCourseView = RENEWAL_VIEW, teachers: unknown[] = [ABRAR]): void {
  const slots = [NEXT_SUN, NEXT_SUN_LATER, NEXT_WED].map((at) => ({ starts_at: at, ends_at: at, conflicts: [] }));
  const routes: [string, unknown][] = [
    ['/sales/booking/course', view],
    ['/sales/booking/teachers', teachers],
    ['/sales/booking/slots', { teacher_tz: 'Africa/Cairo', step_min: 45, slots }],
  ];
  apiFetch.mockImplementation((path: string) => {
    const hit = routes.find(([prefix]) => path.startsWith(prefix));
    return hit ? Promise.resolve(hit[1]) : Promise.reject(new Error(`unmocked ${path}`));
  });
}
