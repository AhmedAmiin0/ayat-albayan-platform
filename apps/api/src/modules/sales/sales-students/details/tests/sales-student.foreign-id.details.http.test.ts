import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MINE, studentsApp } from '@/modules/sales/sales-students/sales-students.fakes';

type App = Awaited<ReturnType<typeof studentsApp>>;
const DETAILS = `/sales/students/${MINE}`;

// Any salesperson reads any student's file (docs/16 row 36), so another salesperson's student is
// read with `mine` false; the logins outside sales are refused before anything is read.
describe('GET /sales/students/:id with someone else\'s student id', () => {
  let t: App;
  beforeAll(async () => {
    t = await studentsApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => t.reset());

  it('a teacher or guardian is 403 and no student is read', async () => {
    for (const token of ['teacher', 'guardian'] as const) {
      expect([token, (await t.call('GET', DETAILS, { token })).statusCode]).toEqual([token, 403]);
    }
    expect(t.queries.student).not.toHaveBeenCalled();
  });

  it('another salesperson\'s student is read as not hers', async () => {
    const res = await t.call('GET', DETAILS, { token: 'salesB' });
    expect([res.statusCode, res.json().mine]).toEqual([200, false]);
  });

  it('an unknown student id is 404 student_not_found', async () => {
    t.queries.student.mockResolvedValue(null);
    const res = await t.call('GET', DETAILS, { token: 'salesB' });
    expect([res.statusCode, res.json().code]).toEqual([404, 'student_not_found']);
  });
});
