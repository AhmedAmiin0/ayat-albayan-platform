import type { FeedbackRowView, TeacherFeedbackSummary } from './types';

// «رأيك يهمّنا» test rows in the GET /feedback shape.

export const answered: FeedbackRowView = {
  id: 'f-1',
  lesson_id: 'l-1',
  student: { id: 's-1', code: 'AB-0182', name: 'يوسف أحمد' },
  teacher: { id: 't-abrar', name: 'أبرار' },
  kind: 'trial',
  rating: 5,
  recommend: 'yes',
  note: 'الحلقة كانت ممتازة',
  contact_phone: '+966552147730',
  requested_at: '2026-10-03T14:00:00Z',
  expires_at: '2026-10-17T14:00:00Z',
  submitted_at: '2026-10-03T15:30:00Z',
};

export const pending: FeedbackRowView = {
  ...answered,
  id: 'f-2',
  student: { id: 's-2', code: 'AB-0184', name: 'مريم علي' },
  kind: 'subscription',
  rating: null,
  recommend: null,
  note: null,
  contact_phone: null,
  submitted_at: null,
};

export const summary: TeacherFeedbackSummary[] = [
  { teacher: { id: 't-abrar', name: 'أبرار' }, avg_rating: 4.5, n: 12, recommend_yes_pct: 83.3 },
];

export const page = (items: FeedbackRowView[]) => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 25,
});
