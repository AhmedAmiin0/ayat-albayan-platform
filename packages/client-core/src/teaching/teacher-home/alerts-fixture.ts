import type { LessonView, NotificationItem } from '@ab/shared';

// Test builders for «تنبيهات اليوم»: her lessons on Saturday 14 November 2026, Riyadh (UTC+3).

export const TZ = 'Asia/Riyadh';
/** 12:00 in Riyadh. */
export const NOW = new Date('2026-11-14T09:00:00Z');

export const lesson = (o: Partial<LessonView> & { id: string }): LessonView => ({
  rule_id: null,
  teacher: { id: 't1', display_name_ar: 'معلم', tz: TZ },
  starts_at: '2026-11-14T13:00:00Z',
  ends_at: '2026-11-14T14:00:00Z',
  status: 'scheduled',
  meeting_link: null,
  cancel_reason: null,
  override_reason: null,
  confirmed_at: null,
  teacher_confirmed_at: '2026-11-13T09:00:00Z',
  rescheduled_from_id: null,
  students: [],
  allowed_events: [],
  conflicts: [],
  pending_proposal: null,
  ...o,
});

export const bellRow = (o: Partial<NotificationItem> & { id: string }): NotificationItem => ({
  kind: 'lesson_cancelled',
  title: 'أُلغيت حلقة',
  body: 'نص',
  data: {},
  created_at: '2026-11-14T07:00:00Z',
  read_at: null,
  ...o,
});
