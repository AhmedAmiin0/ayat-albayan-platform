import type { SalesStudentDetails, SalesStudentLesson } from '@ab/shared';

// GET /sales/students/:id as the API answers it (docs/16 row 36): no price, payment, note or phone.

/** One of the student's upcoming lessons (hers: `mine`), no link: 45 minutes from `starts_at`. */
export const upcoming = (id: string, starts_at: string): SalesStudentLesson => ({
  id, starts_at, ends_at: new Date(Date.parse(starts_at) + 45 * 60_000).toISOString(), status: 'scheduled', trial: false, makeup: false,
  teacher: { id: 't1', display_name_ar: 'أبرار محمد', display_name_en: null, tz: 'Africa/Cairo' },
  students: [{ id: 'st1', code: 'AB-0183', name: 'يوسف أحمد', tz: 'Africa/Cairo', mine: true }],
});

/** Sun, Tue, Thu 19:00 in Cairo (20:00 Riyadh) from Sunday 1 November 2026. */
export const weeklySlot = { rule_id: 'r1', byday: [0, 2, 4], start_time_local: '19:00', tz: 'Africa/Cairo', duration_min: 45, teacher_name: 'أبرار محمد',
  next: ['2026-11-01T17:00:00.000Z', '2026-11-03T17:00:00.000Z', '2026-11-05T17:00:00.000Z'] };

export const details = (over: Partial<SalesStudentDetails> = {}): SalesStudentDetails => ({
  student: { id: 'st1', code: 'AB-0183', name: 'يوسف أحمد', status: 'active', program: 'quran', teacher_name: 'أبرار محمد' },
  subscriptions: [
    { id: 'sub2', package: '8', status: 'active', starts_on: '2026-10-01', renews_on: '2026-11-01', ended_at: null, created_at: '2026-09-30T10:00:00.000Z', lessons_total: 8, lessons_used: 3, lessons_remaining: 5 },
    { id: 'sub1', package: '4', status: 'expired', starts_on: '2026-09-01', renews_on: null, ended_at: '2026-09-29T16:00:00.000Z', created_at: '2026-08-30T10:00:00.000Z', lessons_total: 4, lessons_used: 4, lessons_remaining: 0 },
  ],
  current_id: 'sub2',
  attendance: {
    items: [
      { lesson_id: 'l3', starts_at: '2026-10-08T15:00:00.000Z', kind: 'absent' },
      { lesson_id: 'l2', starts_at: '2026-10-06T15:00:00.000Z', kind: 'cancelled' },
      { lesson_id: 'l1', starts_at: '2026-10-04T15:00:00.000Z', kind: 'present' },
    ],
    totals: { present: 1, absent: 1, excused: 0, cancelled: 1, unmarked: 0 },
  },
  reports: {
    total: 1,
    items: [{
      id: 'r1', lesson_id: 'l1', starts_at: '2026-10-04T15:00:00.000Z', lesson_no: 12, teacher: { id: 't1', display_name_ar: 'أبرار محمد' },
      attendance: 'on_time', grade_overall: 'excellent', status: 'submitted', version: 1, pdf_status: 'ready', sent_at: '2026-10-04T16:00:00.000Z',
    }],
  },
  schedule: { weekly: [weeklySlot], upcoming: [upcoming('u1', '2026-11-01T17:00:00.000Z'), upcoming('u2', '2026-11-03T17:00:00.000Z')] },
  ...over,
});
