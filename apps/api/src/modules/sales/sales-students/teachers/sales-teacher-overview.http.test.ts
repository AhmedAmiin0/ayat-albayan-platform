import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { studentsApp } from '../sales-students.fakes';
import { NOW, TEACHER } from './sales-teacher-overview.fakes';

type App = Awaited<ReturnType<typeof studentsApp>>;
const SECRET = /price|rate|payout|balance|amount|meeting|link|secret|290/i;

describe('GET /sales/teachers/:id/overview (owner 2026-10-28, docs/16 row 36b)', () => {
  let t: App;
  beforeAll(async () => {
    t = await studentsApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    t.reset();
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  });
  afterEach(() => vi.useRealTimers());

  it('any salesperson: the weekly slots in Riyadh and the last 30 days\' totals and lessons; never money or a link', async () => {
    const res = await t.call('GET', `/sales/teachers/${TEACHER}/overview`, { token: 'salesB' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.weekly.map((s: { weekday: number; time: string }) => [s.weekday, s.time])).toEqual([[0, '20:00'], [2, '20:00']]);
    expect(body.attendance.totals).toEqual({ held: 2, student_absent: 1, cancelled_by_teacher: 1, cancelled_by_admin: 0, other: 0 });
    expect(body.attendance.latest).toHaveLength(4);
    expect(t.overview.lessons).toHaveBeenCalledWith(TEACHER, { from: new Date('2026-09-28T10:00:00Z'), to: NOW });
    expect(res.body).not.toMatch(SECRET);
  });

  it('an unknown teacher: 404 teacher_not_found, nothing else read; a malformed id 400', async () => {
    const res = await t.call('GET', '/sales/teachers/7c000000-0000-4000-8000-0000000000e2/overview', { token: 'salesA' });
    expect([res.statusCode, res.json().code]).toEqual([404, 'teacher_not_found']);
    expect(t.overview.rules).not.toHaveBeenCalled();
    expect((await t.call('GET', '/sales/teachers/nope/overview', { token: 'salesA' })).statusCode).toBe(400);
  });

  it('only a salesperson: admin, teacher and the classroom assistant are 403', async () => {
    for (const token of ['admin', 'teacher', 'assistant'] as const) {
      expect([token, (await t.call('GET', `/sales/teachers/${TEACHER}/overview`, { token })).statusCode]).toEqual([token, 403]);
    }
  });
});
