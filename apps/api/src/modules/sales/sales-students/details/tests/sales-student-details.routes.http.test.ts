import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MINE, studentsApp } from '@/modules/sales/sales-students/sales-students.fakes';

type App = Awaited<ReturnType<typeof studentsApp>>;
const URL = `/sales/students/${MINE}`;

describe('GET /sales/students/:id served from its route object', () => {
  let t: App;
  beforeAll(async () => {
    t = await studentsApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => t.reset());

  it('a malformed :id answers the validation_failed envelope before anything is read', async () => {
    const res = await t.call('GET', '/sales/students/nope', { token: 'salesA' });
    expect([res.statusCode, res.json<{ message: string }>().message]).toEqual([
      400,
      'validation_failed',
    ]);
    expect(t.queries.student).not.toHaveBeenCalled();
  });

  it('a stored student status outside its enum is a 500 response_invalid', async () => {
    const row = { id: MINE, code: 'AB-0101', name: 'ياسمين', status: 'gone', program: 'quran' };
    t.queries.student.mockResolvedValue({ ...row, tz: null, teacher: null, guardian: null });
    const res = await t.call('GET', URL, { token: 'salesA' });
    expect([res.statusCode, res.json<{ code: string }>().code]).toEqual([500, 'response_invalid']);
  });

  it('a stored program outside its enum is a 500 response_invalid', async () => {
    const row = { id: MINE, code: 'AB-0101', name: 'ياسمين', status: 'active', program: 'chess' };
    t.queries.student.mockResolvedValue({ ...row, tz: null, teacher: null, guardian: null });
    const res = await t.call('GET', URL, { token: 'salesA' });
    expect([res.statusCode, res.json<{ code: string }>().code]).toEqual([500, 'response_invalid']);
  });

  it('the answer keeps no note, secret link or teacher phone of the stored rows', async () => {
    const res = await t.call('GET', URL, { token: 'salesA' });
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toMatch(/secret|سر|\+201001234567/);
  });
});
