import type { OverviewTeacher, ScheduleOverview } from '@ab/shared';
import { cancelled, done, lesson, muscat, pending } from '@/today/fixtures';

// Test-only GET /lessons/overview rows for the week of Saturday 26 Sep 2026 (Riyadh UTC+3).
// Thursday 1 Oct: أبرار (Cairo) held 10:00, has 16:00 and 17:00 booked and 10:45–16:00 free;
// سارة is off all day; عمر has nothing booked and is free 20:00 to midnight.

const base: OverviewTeacher = {
  id: 't1',
  display_name_ar: 'أبرار',
  gender: 'female',
  programs: ['quran'],
  tz: 'Africa/Cairo',
  status: 'active',
  meeting_link: null,
  students_count: 3,
  max_students: 10,
  windows: [],
  time_off: [],
  free: [],
};

export const abrar: OverviewTeacher = {
  ...base,
  windows: [{ starts_at: '2026-10-01T07:00:00.000Z', ends_at: '2026-10-01T15:00:00.000Z' }],
  free: [{ starts_at: '2026-10-01T07:45:00.000Z', ends_at: '2026-10-01T13:00:00.000Z' }],
};

export const sara: OverviewTeacher = {
  ...base,
  id: 't2',
  display_name_ar: 'سارة',
  programs: ['arabic'],
  tz: 'Asia/Riyadh',
  students_count: 0,
  max_students: null,
  time_off: [
    {
      id: 'off1',
      starts_at: '2026-09-30T21:00:00.000Z',
      ends_at: '2026-10-01T21:00:00.000Z',
      reason: 'سفر',
    },
  ],
};

/** His Thursday window runs past Riyadh midnight: the day shows it up to 24:00. */
export const omar: OverviewTeacher = {
  ...base,
  id: 't3',
  display_name_ar: 'عمر',
  gender: 'male',
  programs: ['quran', 'islamic_studies'],
  tz: 'Asia/Riyadh',
  students_count: 0,
  max_students: null,
  windows: [{ starts_at: '2026-10-01T17:00:00.000Z', ends_at: '2026-10-01T23:00:00.000Z' }],
  free: [{ starts_at: '2026-10-01T17:00:00.000Z', ends_at: '2026-10-01T23:00:00.000Z' }],
};

/** Saturday 26 Sep 13:00 Riyadh, a trial. */
export const trialSat = {
  ...lesson({
    id: 'sat',
    starts_at: '2026-09-26T10:00:00.000Z',
    ends_at: '2026-09-26T10:45:00.000Z',
  }),
  trial: true,
};

export const OVERVIEW: ScheduleOverview = {
  from: '2026-09-25T21:00:00.000Z',
  to: '2026-10-02T21:00:00.000Z',
  teachers: [omar, abrar, sara],
  lessons: [trialSat, done, pending, cancelled, muscat],
};

/** The request the screen sends for a week starting on `from` (Riyadh midnight, UTC). */
export const overviewPath = (from: string, to: string) =>
  `/lessons/overview?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

export const THIS_WEEK = overviewPath(OVERVIEW.from, OVERVIEW.to);
