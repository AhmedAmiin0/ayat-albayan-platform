import { describe, expect, it } from 'vitest';
import { salesAcademyListRoutes as routes } from '../academy-lists.routes';

const SUB = 'c1000000-0000-4000-8000-0000000000c1';
const PUPIL = {
  id: 's1',
  code: 'AB-0101',
  name: 'ياسمين',
  program: 'quran',
  status: 'active',
  next_lesson_at: null,
};
const TEACHER = {
  id: 'tc1',
  name: 'أبرار',
  name_en: null,
  gender: 'female',
  programs: ['quran'],
  lessons_today: 2,
  live_now: false,
  active_count: 1,
  trial_count: 0,
  meeting_link: null,
  platform_classroom: true,
  avatar_url: null,
  students: [PUPIL],
};
const ENTRY = {
  id: SUB,
  package: '8',
  status: 'active',
  starts_on: '2026-09-01',
  lessons_total: 8,
  renews_on: null,
  ended_at: null,
  created_at: '2026-09-01T10:00:00Z',
  lessons_used: 3,
  lessons_remaining: 5,
  status_changes: [{ at: '2026-09-01T10:00:00Z', from: null, to: 'unpaid' }],
  payments: [{ id: 'p1', paid_at: '2026-09-02', kind: 'payment', amount: 290, currency: 'SAR' }],
};
const HISTORY = {
  subscription_id: SUB,
  student: { id: 's1', code: 'AB-0101', name: 'ياسمين' },
  subscriptions: [ENTRY],
};

describe('salesAcademyListRoutes', () => {
  it('keeps the paths, the permissions and the tag the api serves today', () => {
    const wire = Object.values(routes).map((r) => [r.method, r.path, r.permissions, r.tags]);
    expect(wire).toEqual([
      ['GET', '/sales/teachers', ['self.sales_academy'], ['sales']],
      ['GET', '/sales/subscriptions/:id/history', ['self.sales'], ['sales']],
    ]);
  });

  it('answers the teachers and accepts one cached before its optional fields existed', () => {
    expect(routes.teachers.response.parse([TEACHER])).toEqual([TEACHER]);
    const { platform_classroom, avatar_url, ...old } = TEACHER;
    expect(routes.teachers.response.safeParse([old]).success).toBe(true);
    expect([platform_classroom, avatar_url]).toEqual([true, null]);
  });

  it('refuses a teacher with an unknown gender or a student with an unknown status', () => {
    const bad = [
      { ...TEACHER, gender: 'x' },
      { ...TEACHER, programs: ['chess'] },
      { ...TEACHER, students: [{ ...PUPIL, status: 'lost' }] },
    ];
    for (const teacher of bad) {
      expect(routes.teachers.response.safeParse([teacher]).success).toBe(false);
    }
  });

  it('takes a uuid subscription id and refuses another', () => {
    expect(routes.history.params.parse({ id: SUB })).toEqual({ id: SUB });
    expect(routes.history.params.safeParse({ id: 'nope' }).success).toBe(false);
  });

  it('answers the history with no price, and refuses an unknown status or payment kind', () => {
    expect(routes.history.response.parse(HISTORY)).toEqual(HISTORY);
    const priced = { ...HISTORY, subscriptions: [{ ...ENTRY, price: 290 }] };
    expect(routes.history.response.parse(priced).subscriptions[0]).not.toHaveProperty('price');
    const bad = [
      { ...ENTRY, status: 'lost' },
      { ...ENTRY, status_changes: [{ at: 'x', from: 'lost', to: null }] },
      { ...ENTRY, payments: [{ ...ENTRY.payments[0], kind: 'gift' }] },
    ];
    for (const entry of bad) {
      const history = { ...HISTORY, subscriptions: [entry] };
      expect(routes.history.response.safeParse(history).success).toBe(false);
    }
  });
});
