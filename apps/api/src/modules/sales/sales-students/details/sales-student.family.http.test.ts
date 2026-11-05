import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MINE, OTHER, studentsApp } from '@/modules/sales/sales-students/sales-students.fakes';

type App = Awaited<ReturnType<typeof studentsApp>>;

// «العائلة» (owner 2026-11-02): the guardian and the siblings on «تفاصيل الطالب».
describe('GET /sales/students/:id `family`', () => {
  let t: App;
  beforeAll(async () => {
    t = await studentsApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => t.reset());

  it('the guardian name and the other students (name, code, status); never their notes', async () => {
    const res = await t.call('GET', `/sales/students/${MINE}`, { token: 'salesA' });
    expect(res.json().family).toEqual({
      guardian_name: 'أم ياسمين',
      contact_is_self: false,
      siblings: [{ id: OTHER, code: 'AB-0102', name: 'مريم', status: 'paused' }],
    });
    expect(res.body).not.toMatch(/سر|secret/);
  });

  it('another assistant\'s student reads the same family (every assistant sees every student)', async () => {
    const other = (await t.call('GET', `/sales/students/${MINE}`, { token: 'salesB' })).json();
    const hers = (await t.call('GET', `/sales/students/${MINE}`, { token: 'salesA' })).json();
    expect(other.family).toEqual(hers.family);
  });
});
