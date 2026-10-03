import type { FeedbackRowView, TeacherAverageView } from './types';

// Test data only (imported by *.test.tsx): rows shaped like GET /feedback and /feedback/summary.

export const ROW_DONE: FeedbackRowView = {
  id: 'f-1',
  lesson_id: 'l-1',
  student: { id: 's-1', name: 'سهيلة', code: 'AB-0183' },
  teacher: { id: 't-abrar', display_name_ar: 'أبرار' },
  kind: 'trial',
  rating: 5,
  recommend: 'yes',
  note: 'ما شاء الله',
  contact_phone: '+201001234567',
  requested_at: '2026-10-03T10:00:00.000Z',
  submitted_at: '2026-10-03T12:00:00.000Z',
};

export const ROW_PENDING: FeedbackRowView = {
  ...ROW_DONE,
  id: 'f-2',
  student: { id: 's-2', name: 'جود', code: 'AB-0184' },
  kind: 'subscription',
  rating: null,
  recommend: null,
  note: null,
  submitted_at: null,
};

export const SUMMARY: TeacherAverageView[] = [
  { teacher_id: 't-abrar', display_name_ar: 'أبرار', avg_rating: 4.5, n: 2, recommend_yes_pct: 50 },
];
