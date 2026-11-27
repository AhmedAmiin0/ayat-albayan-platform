import { describe, expect, it } from 'vitest';
import { salesAcademyDayRoutes as routes } from '../academy-day.routes';

const TEACHER = '11111111-1111-4111-8111-111111111111';
const LESSON = {
  id: 'les-2',
  starts_at: '2026-10-11T16:00:00.000Z',
  ends_at: '2026-10-11T16:30:00.000Z',
  status: 'confirmed',
  trial: true,
  makeup: false,
  teacher_confirmed_at: null,
  meeting_link: null,
  platform_classroom: false,
  teacher: { id: 'tc1', display_name_ar: 'أبرار', display_name_en: null },
  students: [{ id: 's1', code: 'AB-0101', name: 'ياسمين', mine: true }],
};
const LIVE = {
  lesson_id: 'les-1',
  starts_at: '2026-10-11T16:00:00.000Z',
  ends_at: '2026-10-11T16:30:00.000Z',
  status: 'confirmed',
  teacher_name: 'أبرار',
  student_names: ['ياسمين'],
};

describe('salesAcademyDayRoutes', () => {
  it('keeps the paths, the permission and the tag the api serves today', () => {
    const wire = Object.values(routes).map((r) => [r.method, r.path, r.permissions, r.tags]);
    expect(wire).toEqual([
      ['GET', '/sales/schedule', ['self.sales_academy'], ['sales']],
      ['GET', '/sales/live', ['self.sales_academy'], ['sales']],
    ]);
  });

  it('takes an optional Riyadh day and teacher, and refuses a bad one', () => {
    const query = routes.day.query;
    expect(query.parse({})).toEqual({});
    expect(query.parse({ date: '2026-10-11', teacherId: TEACHER })).toEqual({
      date: '2026-10-11',
      teacherId: TEACHER,
    });
    expect(query.safeParse({ date: '11/10/2026' }).success).toBe(false);
    expect(query.safeParse({ teacherId: 'nope' }).success).toBe(false);
  });

  it('answers the day and accepts a lesson cached before its optional fields existed', () => {
    const day = { date: '2026-10-11', lessons: [LESSON] };
    expect(routes.day.response.parse(day)).toEqual(day);
    const { meeting_link, platform_classroom, teacher_confirmed_at, ...old } = LESSON;
    expect(routes.day.response.safeParse({ ...day, lessons: [old] }).success).toBe(true);
    expect([meeting_link, platform_classroom, teacher_confirmed_at]).toEqual([null, false, null]);
  });

  it('refuses a lesson with an unknown status or without its times', () => {
    const bad = [{ ...LESSON, status: 'lost' }, { ...LESSON, starts_at: null }];
    for (const lesson of bad) {
      const day = { date: '2026-10-11', lessons: [lesson] };
      expect(routes.day.response.safeParse(day).success).toBe(false);
    }
  });

  it('answers the running lessons in the assistant row shape', () => {
    expect(routes.live.response.parse([LIVE])).toEqual([LIVE]);
    expect(routes.live.response.safeParse([{ ...LIVE, status: 'lost' }]).success).toBe(false);
  });
});
