// Test fixtures for the schedule-change notices (test-only, excluded from the build by *.fakes.ts).
import type { NoticeLessonRow } from './notice.build';
import type { Notice, NoticeGuardian, NoticeStudent, NoticeTeacher } from './notice.types';

export const NOW = new Date('2026-11-01T06:00:00Z');
/** Monday 2 November 08:00 UTC: 11:00 in Riyadh, 08:00 in London. */
export const AT = new Date('2026-11-02T08:00:00Z');
/** Sunday 1 November 15:00 UTC: 18:00 in Riyadh. */
export const FROM = new Date('2026-11-01T15:00:00Z');

export const teacher = (over: Partial<NoticeTeacher> = {}): NoticeTeacher => ({
  id: 'T1',
  profile_id: 'pT1',
  phone_e164: '+966500000001',
  tz: 'Asia/Riyadh',
  display_name_ar: 'أ. فاطمة',
  status: 'active',
  profile: { disabled_at: null },
  ...over,
});

export const guardian = (over: Partial<NoticeGuardian> = {}): NoticeGuardian => ({
  id: 'G1',
  name: 'أم سهيلة',
  phone_e164: '+447700900001',
  tz: 'Europe/London',
  profile_id: 'pG1',
  ...over,
});

export const student = (over: Partial<NoticeStudent> = {}): NoticeStudent => ({
  id: 'S1',
  name: 'سهيلة',
  tz: 'Europe/London',
  profile_id: null,
  guardian: guardian(),
  ...over,
});

export const notice = (over: Partial<Notice> = {}): Notice => ({
  key: 'lesson_cancelled',
  subject: 'L1',
  lessonId: 'L1',
  at: AT,
  teachers: [{ teacher: teacher(), at: AT }],
  students: [student()],
  actorId: 'pADMIN',
  ...over,
});

export const lessonRow = (over: Partial<NoticeLessonRow> = {}): NoticeLessonRow => ({
  id: 'L1',
  starts_at: AT.toISOString(),
  teacher: teacher(),
  lesson_students: [{ student: student() }],
  ...over,
});
