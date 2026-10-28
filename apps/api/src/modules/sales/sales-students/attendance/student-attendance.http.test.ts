import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { studentsApp } from '../sales-students.fakes';
import { NOW, STUDENT } from './student-attendance.fakes';

type App = Awaited<ReturnType<typeof studentsApp>>;
const SECRET = /price|amount|meeting|link|secret|notes|290/i;
const UNKNOWN = '7c000000-0000-4000-8000-0000000000e2';

describe('GET /sales/students/:id/attendance and /students/:id/attendance («سجل الحضور», owner 2026-10-28)', () => {
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

  it('her student, the current Riyadh month by default: rows, totals, months; mine; never money, a link or notes', async () => {
    const res = await t.call('GET', `/sales/students/${STUDENT}/attendance`, { token: 'salesA' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect([body.month, body.months, body.mine]).toEqual(['2026-10', ['2026-10', '2026-09', '2026-08'], true]);
    expect(body.items).toHaveLength(8);
    expect(body.totals.held).toBe(3);
    expect(t.attendance.lessons).toHaveBeenCalledWith(STUDENT, { from: new Date('2026-09-30T21:00:00Z'), to: NOW });
    expect(res.body).not.toMatch(SECRET);
  });

  it('any student for another salesperson (mine false); a past month reads its whole Riyadh bounds', async () => {
    const res = await t.call('GET', `/sales/students/${STUDENT}/attendance?month=2026-08`, { token: 'salesB' });
    expect([res.statusCode, res.json().month, res.json().mine]).toEqual([200, '2026-08', false]);
    expect(t.attendance.lessons).toHaveBeenCalledWith(STUDENT, { from: new Date('2026-07-31T21:00:00Z'), to: new Date('2026-08-31T21:00:00Z') });
  });

  it('a bad month is 400 invalid_month; an unknown student 404 student_not_found; a malformed id 400', async () => {
    const bad = await t.call('GET', `/sales/students/${STUDENT}/attendance?month=2026-13`, { token: 'salesA' });
    expect([bad.statusCode, bad.json().code]).toEqual([400, 'invalid_month']);
    const res = await t.call('GET', `/sales/students/${UNKNOWN}/attendance`, { token: 'salesA' });
    expect([res.statusCode, res.json().code]).toEqual([404, 'student_not_found']);
    expect(t.attendance.lessons).not.toHaveBeenCalled();
    expect((await t.call('GET', '/sales/students/nope/attendance', { token: 'salesA' })).statusCode).toBe(400);
  });

  it('the admin reads the same table on /students/:id/attendance (mine); sales is 403 there', async () => {
    const res = await t.call('GET', `/students/${STUDENT}/attendance?month=2026-10`, { token: 'admin' });
    expect([res.statusCode, res.json().mine, res.json().items.length]).toEqual([200, true, 8]);
    expect(res.body).not.toMatch(SECRET);
    expect((await t.call('GET', `/students/${UNKNOWN}/attendance`, { token: 'admin' })).statusCode).toBe(404);
    expect((await t.call('GET', `/students/${STUDENT}/attendance`, { token: 'salesA' })).statusCode).toBe(403);
  });

  it('the sales route is a salesperson\'s only: admin, teacher and the classroom assistant are 403', async () => {
    for (const token of ['admin', 'teacher', 'assistant'] as const) {
      expect([token, (await t.call('GET', `/sales/students/${STUDENT}/attendance`, { token })).statusCode]).toEqual([token, 403]);
    }
  });
});
