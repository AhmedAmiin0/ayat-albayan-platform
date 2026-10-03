import { describe, expect, it } from 'vitest';
import { toLessonView } from '../lessons.mapper';
import { lessonRow, OTHER_TEACHER_ID, TEACHER_ID } from '../lessons.fakes';
import { toOverview, type OverviewParts } from './overview.mapper';
import type { OverviewTeacherRow } from './overview.queries';

// The Riyadh day Sunday 2026-10-04; the fake lesson is 14:00Z–14:45Z with أبرار.
const window = { from: new Date('2026-10-03T21:00:00Z'), to: new Date('2026-10-04T21:00:00Z') };
const teacher = (over: Partial<OverviewTeacherRow>): OverviewTeacherRow => ({
  ...{ id: TEACHER_ID, display_name_ar: 'أبرار', display_name_en: null, gender: 'female', programs: ['quran'], tz: 'Africa/Cairo' },
  ...{ meeting_link: null, max_students: 12, status: 'active' },
  ...over,
});
const lesson = (over: Parameters<typeof lessonRow>[0] = {}) => toLessonView(lessonRow(over), { role: 'admin', seq: new Map() });
const parts = (over: Partial<OverviewParts> = {}): OverviewParts => ({
  window,
  teachers: [teacher({})],
  // 16:00–18:00 Cairo summer time = 13:00Z–15:00Z
  slots: [{ teacher_id: TEACHER_ID, weekday: 0, start_time: '16:00:00', end_time: '18:00:00', tz: 'Africa/Cairo' }],
  timeOff: [],
  carry: [],
  loads: new Map([[TEACHER_ID, 7]]),
  lessons: [lesson()],
  ...over,
});

describe('toOverview (R-SCH-09)', () => {
  it('a teacher with load, windows and the free time around an occupying lesson', () => {
    const [abrar] = toOverview(parts()).teachers;
    expect(abrar).toMatchObject({ id: TEACHER_ID, students_count: 7, max_students: 12, status: 'active' });
    expect(abrar?.windows).toEqual([{ starts_at: '2026-10-04T13:00:00.000Z', ends_at: '2026-10-04T15:00:00.000Z' }]);
    expect(abrar?.free).toEqual([
      { starts_at: '2026-10-04T13:00:00.000Z', ends_at: '2026-10-04T14:00:00.000Z' },
    ]);
  });

  it('a cancelled lesson frees its time; time off is listed and blocks', () => {
    const off = { id: 'off1', teacher_id: TEACHER_ID, starts_at: '2026-10-04 13:00:00+00', ends_at: '2026-10-04 13:30:00+00', reason: 'مشوار' };
    const [abrar] = toOverview(parts({ lessons: [lesson({ status: 'cancelled_by_admin' })], timeOff: [off] })).teachers;
    expect(abrar?.time_off).toEqual([
      { id: 'off1', reason: 'مشوار', starts_at: '2026-10-04T13:00:00.000Z', ends_at: '2026-10-04T13:30:00.000Z' },
    ]);
    expect(abrar?.free).toEqual([{ starts_at: '2026-10-04T13:30:00.000Z', ends_at: '2026-10-04T15:00:00.000Z' }]);
  });

  it('every active teacher gets a row (empty ones too, load 0); an inactive one only with a lesson', () => {
    const teachers = [
      teacher({}),
      teacher({ id: OTHER_TEACHER_ID, display_name_ar: 'سارة', status: 'active' }),
      teacher({ id: 'gone', display_name_ar: 'بسمة', status: 'inactive' }),
      teacher({ id: 'left', display_name_ar: 'تقى', status: 'inactive' }),
    ];
    const leftover = lesson({ id: 'l2', teacher_id: 'left', teacher: { id: 'left', display_name_ar: 'تقى', display_name_en: null, tz: 'Africa/Cairo' } });
    const out = toOverview(parts({ teachers, lessons: [leftover, lesson()] }));
    expect(out.teachers.map((t) => t.display_name_ar)).toEqual(['أبرار', 'تقى', 'سارة']);
    expect(out.teachers[2]).toMatchObject({ students_count: 0, windows: [], free: [], time_off: [] });
    expect(out.lessons.map((l) => l.id)).toHaveLength(2);
  });

  it('lessons by starts_at; the window echoes back as ISO', () => {
    const late = lesson({ id: 'late', starts_at: '2026-10-04T18:00:00+00:00', ends_at: '2026-10-04T18:45:00+00:00' });
    const out = toOverview(parts({ lessons: [late, lesson()] }));
    expect(out.lessons.map((l) => l.id)).toEqual([lesson().id, 'late']);
    expect([out.from, out.to]).toEqual(['2026-10-03T21:00:00.000Z', '2026-10-04T21:00:00.000Z']);
  });
});
