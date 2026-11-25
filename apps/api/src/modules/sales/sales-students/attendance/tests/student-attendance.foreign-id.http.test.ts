import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { studentsApp } from '@/modules/sales/sales-students/sales-students.fakes';
import { NOW, STUDENT } from '@/modules/sales/sales-students/attendance/student-attendance.fakes';

type App = Awaited<ReturnType<typeof studentsApp>>;
const TABLE = `/sales/students/${STUDENT}/attendance`;

// Any salesperson reads any student's attendance (docs/16 row 36), as not hers; the logins
// outside sales are refused before anything is read.
describe('GET /sales/students/:id/attendance with someone else\'s student id', () => {
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

  it('a teacher or guardian is 403 and no lesson is read', async () => {
    for (const token of ['teacher', 'guardian'] as const) {
      expect([token, (await t.call('GET', TABLE, { token })).statusCode]).toEqual([token, 403]);
    }
    expect(t.attendance.lessons).not.toHaveBeenCalled();
  });

  it('another salesperson\'s student is read as not hers', async () => {
    const res = await t.call('GET', TABLE, { token: 'salesB' });
    expect([res.statusCode, res.json().mine]).toEqual([200, false]);
  });

  it('an unknown student id is 404 student_not_found and no lesson is read', async () => {
    const unknown = '/sales/students/7c000000-0000-4000-8000-0000000000e2/attendance';
    const res = await t.call('GET', unknown, { token: 'salesB' });
    expect([res.statusCode, res.json().code]).toEqual([404, 'student_not_found']);
    expect(t.attendance.lessons).not.toHaveBeenCalled();
  });
});
