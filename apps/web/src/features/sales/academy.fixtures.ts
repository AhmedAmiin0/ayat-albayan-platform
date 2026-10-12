import type {
  AssistantLessonView,
  SalesScheduleLesson,
  SalesStudentView,
  SalesSubscriptionHistory,
  SalesTeacherStudent,
  SalesTeacherView,
} from '@ab/shared';

// Test fixtures for the sales assistant side (docs/16): what the API sends, nothing more.

export const HISTORY_ID = 'c1000000-0000-4000-8000-0000000000c1';
const iso = (offsetMin: number) => new Date(Date.now() + offsetMin * 60_000).toISOString();

export const liveLesson = (over: Partial<AssistantLessonView> = {}): AssistantLessonView => ({
  lesson_id: 'l-live', starts_at: iso(-10), ends_at: iso(35), status: 'confirmed', teacher_name: 'أبرار', student_names: ['سهيلة', 'جود'], ...over,
});

export const pupil = (over: Partial<SalesTeacherStudent> = {}): SalesTeacherStudent => ({
  id: 's1', code: 'AB-0183', name: 'سهيلة', program: 'quran', status: 'active', next_lesson_at: '2026-10-12T15:00:00.000Z', ...over,
});

export const teacher = (over: Partial<SalesTeacherView> = {}): SalesTeacherView => ({
  id: 'tc1', name: 'أبرار', name_en: 'Abrar', gender: 'female', programs: ['quran', 'arabic'], lessons_today: 2, live_now: false,
  students: [pupil()], active_count: 1, trial_count: 0, meeting_link: 'https://meet.example.org/abrar-fixed', ...over,
});

export const scheduleLesson = (over: Partial<SalesScheduleLesson> = {}): SalesScheduleLesson => ({
  id: 'l-1', starts_at: '2026-10-12T15:00:00.000Z', ends_at: '2026-10-12T15:30:00.000Z', status: 'confirmed', trial: false, makeup: false,
  teacher: { id: 'tc1', display_name_ar: 'أبرار', display_name_en: 'Abrar' }, students: [{ id: 's1', code: 'AB-0183', name: 'سهيلة' }], ...over,
});

export const student = (over: Partial<SalesStudentView> = {}): SalesStudentView => ({
  id: 's1', code: 'AB-0183', name: 'سهيلة', status: 'active', program: 'quran', teacher_name: 'أبرار', guardian_name: 'أم سهيلة', ...over,
});

export const history = (): SalesSubscriptionHistory => ({
  subscription_id: HISTORY_ID,
  student: { id: 's1', code: 'AB-0183', name: 'سهيلة' },
  subscriptions: [
    {
      id: 'old', package: '8', status: 'expired', starts_on: '2026-08-01', renews_on: null, ended_at: '2026-08-30T16:30:00Z', created_at: '2026-08-01T10:00:00Z',
      lessons_total: 8, lessons_used: 8, lessons_remaining: 0, status_changes: [], payments: [],
    },
    {
      id: HISTORY_ID, package: '8', status: 'active', starts_on: '2026-09-01', renews_on: '2026-10-01', ended_at: null, created_at: '2026-09-01T10:00:00Z',
      lessons_total: 8, lessons_used: 3, lessons_remaining: 5,
      status_changes: [{ at: '2026-09-01T10:00:00Z', from: null, to: 'unpaid' }, { at: '2026-09-02T09:00:00Z', from: 'unpaid', to: 'active' }],
      payments: [{ id: 'p1', paid_at: '2026-09-02T09:00:00Z', kind: 'payment', amount: 1290, currency: 'SAR' }],
    },
  ],
});
