import type { SalesCourseView } from '@ab/shared';

// Invented rows in the GET /sales/booking/course shape (no real people).

export const STUDENT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
export const SUB_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

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
