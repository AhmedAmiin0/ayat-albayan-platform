import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { studentsApp } from '@/modules/sales/sales-students/sales-students.fakes';
import { NOW, TEACHER } from '@/modules/sales/sales-students/teachers/sales-teacher-overview.fakes';

type App = Awaited<ReturnType<typeof studentsApp>>;
const OVERVIEW = `/sales/teachers/${TEACHER}/overview`;

// Any salesperson reads any teacher's week (docs/16 row 36b); a teacher may not read another
// teacher's, nor may a family.
describe('GET /sales/teachers/:id/overview with someone else\'s teacher id', () => {
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

  it('a teacher or guardian is 403 and nothing is read', async () => {
    for (const token of ['teacher', 'guardian'] as const) {
      expect([token, (await t.call('GET', OVERVIEW, { token })).statusCode]).toEqual([token, 403]);
    }
    expect(t.overview.exists).not.toHaveBeenCalled();
    expect(t.overview.lessons).not.toHaveBeenCalled();
  });

  it('an unknown teacher id is 404 teacher_not_found', async () => {
    const unknown = '/sales/teachers/7c000000-0000-4000-8000-0000000000e2/overview';
    const res = await t.call('GET', unknown, { token: 'salesB' });
    expect([res.statusCode, res.json().code]).toEqual([404, 'teacher_not_found']);
    expect(t.overview.lessons).not.toHaveBeenCalled();
  });
});
