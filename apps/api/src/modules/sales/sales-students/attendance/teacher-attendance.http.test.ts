import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { studentsApp } from '@/modules/sales/sales-students/sales-students.fakes';
import { lessonRow, NOW, STUDENT } from './student-attendance.fakes';

type App = Awaited<ReturnType<typeof studentsApp>>;
const TEACHER_ROW = '7e000000-0000-4000-8000-000000000001';
const OTHER = '7c000000-0000-4000-8000-0000000000e2';
const url = (id: string, q = '') => `/teachers/me/students/${id}/attendance${q}`;
const ME = { id: TEACHER_ROW, tz: 'America/New_York', students: [{ id: STUDENT }] };

describe('GET /teachers/me/students/:id/attendance — her own «سجل الحضور» (docs/46 C5)', () => {
  let t: App;
  beforeAll(async () => {
    t = await studentsApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    t.reset();
    t.me.me.mockResolvedValue(ME);
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  });
  afterEach(() => vi.useRealTimers());

  it('only her lessons with the student, the month in HER zone; her reading of auto-held', async () => {
    t.attendance.lessons.mockResolvedValue([lessonRow('auto', '2026-10-27T15:00:00+00:00')]);
    const res = await t.call('GET', url(STUDENT), { token: 'teacher' });
    expect(res.statusCode).toBe(200);
    expect(t.me.me).toHaveBeenCalledWith('t1');
    const from = new Date('2026-10-01T04:00:00Z');
    const window = { from, to: NOW, teacherId: TEACHER_ROW };
    expect(t.attendance.lessons).toHaveBeenCalledWith(STUDENT, window);
    expect(t.attendance.starts).toHaveBeenCalledWith(STUDENT, NOW, TEACHER_ROW);
    const body = res.json();
    expect([body.month, body.mine, body.items[0].kind]).toEqual(['2026-10', true, 'unmarked']);
    expect([body.totals.held, body.totals.unmarked]).toEqual([0, 1]);
  });

  it('the admin\'s cancel reason stays with staff; hers shows', async () => {
    t.attendance.lessons.mockResolvedValue([
      lessonRow('a', '2026-10-11T15:00:00+00:00', { status: 'cancelled_by_admin', cancel_reason: 'إداري' }),
      lessonRow('b', '2026-10-13T15:00:00+00:00', { status: 'cancelled_by_teacher', cancel_reason: 'سفر' }),
    ]);
    const items = (await t.call('GET', url(STUDENT), { token: 'teacher' })).json().items;
    expect(items.map((i: { cancel_reason: string | null }) => i.cancel_reason)).toEqual(['سفر', null]);
  });

  it('a student who is not hers → 404 student_not_found, nothing read', async () => {
    const res = await t.call('GET', url(OTHER), { token: 'teacher' });
    expect([res.statusCode, res.json().code]).toEqual([404, 'student_not_found']);
    expect(t.attendance.lessons).not.toHaveBeenCalled();
  });

  it('no teachers row → 404 teacher_not_linked; a bad month 400', async () => {
    const bad = await t.call('GET', url(STUDENT, '?month=2026-13'), { token: 'teacher' });
    expect(bad.statusCode).toBe(400);
    t.me.me.mockResolvedValue(null);
    const res = await t.call('GET', url(STUDENT), { token: 'teacher' });
    expect([res.statusCode, res.json().code]).toEqual([404, 'teacher_not_linked']);
  });

  it('teachers only: sales, the admin and the classroom assistant are 403', async () => {
    for (const token of ['salesA', 'admin', 'assistant'] as const) {
      expect([token, (await t.call('GET', url(STUDENT), { token })).statusCode]).toEqual([token, 403]);
    }
  });
});
