import type { AssistantLessonView, SalesHistoryEntry, SalesStudentView, SalesSubscriptionHistory, SalesTeacherView } from '@ab/shared';
import type { SalesSubscription } from './sales-api';

// Test data shaped like the sales API (docs/16): no price, phone or link anywhere.

export const subscription = (over: Partial<SalesSubscription> = {}): SalesSubscription => ({
  id: 's1',
  student: { id: 'st1', code: 'AB-0183', name: 'يوسف أحمد' },
  package: '8',
  status: 'active',
  starts_on: '2026-10-01',
  lessons_total: 8,
  ...over,
});

export const entry = (over: Partial<SalesHistoryEntry> = {}): SalesHistoryEntry => ({
  id: 's1',
  package: '8',
  status: 'active',
  starts_on: '2026-10-01',
  lessons_total: 8,
  renews_on: '2026-11-01',
  ended_at: null,
  created_at: '2026-09-30T10:00:00.000Z',
  lessons_used: 3,
  lessons_remaining: 5,
  status_changes: [
    { at: '2026-09-30T10:00:00.000Z', from: null, to: 'unpaid' },
    { at: '2026-09-30T22:30:00.000Z', from: 'unpaid', to: 'active' },
  ],
  payments: [{ id: 'p1', paid_at: '2026-09-30T12:00:00.000Z', kind: 'payment' }],
  ...over,
});

export const history = (): SalesSubscriptionHistory => ({
  subscription_id: 's1',
  student: { id: 'st1', code: 'AB-0183', name: 'يوسف أحمد' },
  subscriptions: [
    entry({ id: 's0', status: 'expired', ended_at: '2026-09-29T21:30:00.000Z', status_changes: [], payments: [] }),
    entry(),
  ],
});

export const teacher = (over: Partial<SalesTeacherView> = {}): SalesTeacherView => ({
  id: 't1',
  name: 'أبرار محمد',
  name_en: 'Abrar Mohamed',
  gender: 'female',
  programs: ['quran', 'arabic'],
  students: [
    { id: 'st1', code: 'AB-0183', name: 'يوسف أحمد' },
    { id: 'st2', code: 'AB-0190', name: 'جنى علي' },
  ],
  ...over,
});

export const student = (over: Partial<SalesStudentView> = {}): SalesStudentView => ({
  id: 'st1',
  code: 'AB-0183',
  name: 'يوسف أحمد',
  status: 'active',
  program: 'quran',
  teacher_name: 'أبرار محمد',
  guardian_name: 'أحمد سالم',
  ...over,
});

export const liveLesson = (over: Partial<AssistantLessonView> = {}): AssistantLessonView => ({
  lesson_id: 'l1',
  starts_at: '2026-10-01T13:00:00.000Z',
  ends_at: '2026-10-01T13:45:00.000Z',
  status: 'confirmed',
  teacher_name: 'أبرار محمد',
  student_names: ['يوسف', 'جنى'],
  ...over,
});
