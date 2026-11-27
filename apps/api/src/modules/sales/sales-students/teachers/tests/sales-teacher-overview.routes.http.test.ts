import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { studentsApp } from '@/modules/sales/sales-students/sales-students.fakes';
import {
  NOW,
  TEACHER,
  teacherLesson,
} from '@/modules/sales/sales-students/teachers/sales-teacher-overview.fakes';

type App = Awaited<ReturnType<typeof studentsApp>>;
const URL = `/sales/teachers/${TEACHER}/overview`;

describe('GET /sales/teachers/:id/overview served from its route object', () => {
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

  it('a malformed :id answers the validation_failed envelope', async () => {
    const res = await t.call('GET', '/sales/teachers/nope/overview', { token: 'salesA' });
    expect([res.statusCode, res.json<{ message: string }>().message]).toEqual([
      400,
      'validation_failed',
    ]);
  });

  it('a stored lesson status outside the catalog is a 500 response_invalid', async () => {
    const odd = { ...teacherLesson('z', '2026-10-27T17:00:00+00:00', 'completed'), status: 'gone' };
    t.overview.lessons.mockResolvedValue([odd]);
    const res = await t.call('GET', URL, { token: 'salesA' });
    expect([res.statusCode, res.json<{ code: string }>().code]).toEqual([500, 'response_invalid']);
  });
});
