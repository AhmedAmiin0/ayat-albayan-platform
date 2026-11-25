import type { Teacher, TeacherListRow, TimeOff } from '../people/teachers';

// Test-only teacher answers shared by the web and mobile tests (never imported by app code): the
// fields a test does not name get neutral values, so each test spells out only what it checks.

const STAMP = '2026-09-01T09:00:00Z';

/** GET /teachers/:id with `over` on top. */
export const teacherFixture = (over: Partial<Teacher> = {}): Teacher => ({
  id: 't1',
  display_name_ar: 'أ. سارة',
  display_name_en: null,
  gender: 'female',
  programs: ['quran'],
  phone_e164: null,
  meeting_link: null,
  meeting_mode: null,
  platform_classroom: false,
  rate_30: null,
  rate_45: null,
  rate_60: null,
  rate_90: null,
  max_students: null,
  status: 'active',
  tz: 'Africa/Cairo',
  calendar_owner: 'script',
  calendar_owner_changed_at: null,
  calendar_owner_changed_by: null,
  google_calendar_id: null,
  mirror_enabled: false,
  profile_id: null,
  avatar_url: null,
  created_at: STAMP,
  created_by: null,
  updated_at: STAMP,
  ...over,
});

/** A GET /teachers row (no students unless `over` says so). */
export const teacherRowFixture = (over: Partial<TeacherListRow> = {}): TeacherListRow => ({
  ...teacherFixture(),
  active_count: 0,
  trial_count: 0,
  ...over,
});

/** A GET /teachers/:id/time-off row. */
export const timeOffFixture = (over: Partial<TimeOff> = {}): TimeOff => ({
  id: 'o1',
  teacher_id: 't1',
  starts_at: '2026-10-10T00:00:00Z',
  ends_at: '2026-10-10T08:00:00Z',
  reason: null,
  created_at: STAMP,
  created_by: null,
  updated_at: STAMP,
  ...over,
});
