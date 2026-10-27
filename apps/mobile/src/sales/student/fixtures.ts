import type { SalesStudentDetails } from '@ab/shared';

// GET /sales/students/:id as the API answers it (docs/16 row 36): no price, payment or note; the guardian's (fake) phone.

export const details = (over: Partial<SalesStudentDetails> = {}): SalesStudentDetails => ({
  student: { id: 'st1', code: 'AB-0183', name: 'يوسف أحمد', status: 'active', program: 'quran', teacher_name: 'أبرار محمد', guardian_phone: '+201001112223' },
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
  ...over,
});
