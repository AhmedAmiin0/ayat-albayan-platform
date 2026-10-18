import type { BookedCourse, SalesCourseView } from '@ab/shared';
import { maryam } from '@/booking/fixtures';

// Invented rows in the GET /sales/booking/course shape (no real people).

export const STUDENT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
export const SUB_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
export const PREV_SUB_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

/** ريم (Riyadh) with an unpaid 8-a-month package of 45 minutes: two days a week. */
export function courseView(patch: Partial<SalesCourseView> = {}): SalesCourseView {
  return {
    student: {
      id: STUDENT_ID,
      code: 'AB-0201',
      name: 'ريم',
      tz: 'Asia/Riyadh',
      program: 'quran',
      teacher_gender_pref: 'female',
      teacher_id: null,
    },
    subscription: { id: SUB_ID, package: '8', duration: 45, lessons_total: 8, starts_on: '2026-10-04' },
    perWeek: 2,
    blocked: null,
    ...patch,
  };
}

/** ريم's course with مريم (Cairo): Sunday 17:00 and Thursday 18:00 (Riyadh), 8 lessons from 13 Sep, two days a week. */
export function bookedCourse(patch: Partial<BookedCourse> = {}): BookedCourse {
  return {
    subscriptionId: PREV_SUB_ID,
    teacherId: maryam.id,
    teacherTz: 'Africa/Cairo',
    durationMin: 45,
    tz: 'Asia/Riyadh',
    startsOn: '2026-09-13',
    endsOn: '2026-10-10',
    days: [
      { weekday: 0, startTimeLocal: '17:00' },
      { weekday: 4, startTimeLocal: '18:00' },
    ],
    lessonsTotal: 8,
    perWeek: 2,
    ...patch,
  };
}
