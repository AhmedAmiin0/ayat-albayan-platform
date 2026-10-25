import type { LessonView, OverviewTeacher, ScheduleOverview } from '@ab/shared';
import { ABRAR, FATMA } from './lesson/lesson-fixture';

// Test data only (imported by *.test.ts[x]): GET /lessons/overview rows for the week of Sat 3 Oct
// 2026 (Riyadh = UTC+3). Abrar works Sunday 16:00–20:00 Riyadh; Fatma is off all Monday.

export function overviewTeacher(o: Partial<OverviewTeacher> & Pick<OverviewTeacher, 'id' | 'display_name_ar'>): OverviewTeacher {
  return {
    gender: 'female',
    programs: ['quran'],
    tz: 'Africa/Cairo',
    status: 'active',
    meeting_link: null,
    students_count: 0,
    max_students: null,
    windows: [],
    time_off: [],
    free: [],
    ...o,
  };
}

export const T_ABRAR = overviewTeacher({
  ...ABRAR,
  students_count: 4,
  max_students: 10,
  windows: [{ starts_at: '2026-10-04T13:00:00.000Z', ends_at: '2026-10-04T17:00:00.000Z' }],
  // Around Sunday's 17:00–17:45 lesson.
  free: [
    { starts_at: '2026-10-04T13:00:00.000Z', ends_at: '2026-10-04T14:00:00.000Z' },
    { starts_at: '2026-10-04T14:45:00.000Z', ends_at: '2026-10-04T17:00:00.000Z' },
  ],
});

export const T_FATMA = overviewTeacher({
  ...FATMA,
  programs: ['quran', 'arabic'],
  tz: 'Asia/Riyadh',
  time_off: [{ id: 'off-1', starts_at: '2026-10-04T21:00:00.000Z', ends_at: '2026-10-05T21:00:00.000Z', reason: 'سفر' }],
});

export const T_NOUR = overviewTeacher({ id: 't-nour', display_name_ar: 'نور', gender: 'male', programs: ['arabic'], tz: 'Asia/Riyadh' });

export function overview(lessons: LessonView[], teachers = [T_ABRAR, T_FATMA, T_NOUR]): ScheduleOverview {
  return { from: '2026-10-02T21:00:00.000Z', to: '2026-10-09T21:00:00.000Z', teachers, lessons };
}
