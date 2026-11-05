import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AFTER,
  BEFORE,
  LESSON_ID,
  OTHER_TEACHER_ID,
} from '@/modules/reporting/reports/reports.fakes';
import { reportsApp } from '@/modules/reporting/reports/test-app';
import { LINK_EXP, linkBase as base, linkToken as link } from './teacher-link.fakes';

describe('the teacher report link: /public/teacher-report/:token (no login, one lesson)', () => {
  let h: Awaited<ReturnType<typeof reportsApp>>;
  beforeAll(async () => {
    h = await reportsApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    h.reset();
    vi.useFakeTimers({ now: AFTER, toFake: ['Date'] });
  });
  afterEach(() => vi.useRealTimers());

  it('GET without a session: the lesson form (drafts made), rate-limited per IP and link', async () => {
    const res = await h.call({ method: 'GET', url: base(), token: 'none' });
    expect(res.statusCode).toBe(200);
    expect(res.json().lesson.id).toBe(LESSON_ID);
    expect(h.reports.ensureDrafts).toHaveBeenCalledWith(
      expect.objectContaining({ id: LESSON_ID }),
      { actorId: null, formVersion: 1 },
    );
    expect(h.link.canActivate).toHaveBeenCalledTimes(1);
  });

  it('a tampered token, another secret or another teacher → 404 link_not_found', async () => {
    const t = link();
    for (const token of [
      `${t.slice(0, -1)}${t.endsWith('A') ? 'B' : 'A'}`,
      link({ secret: 'x'.repeat(40) }),
      link({ teacherId: OTHER_TEACHER_ID }),
    ]) {
      const res = await h.call({ method: 'GET', url: base(token), token: 'none' });
      expect([res.statusCode, res.json().code]).toEqual([404, 'link_not_found']);
    }
  });

  it('before the lesson starts → 409 link_not_open; after its end + the edit hours → 410 link_expired', async () => {
    vi.setSystemTime(BEFORE);
    expect((await h.call({ method: 'GET', url: base(), token: 'none' })).json().code).toBe(
      'link_not_open',
    );
    vi.setSystemTime(new Date(LINK_EXP * 1000 + 1000));
    const res = await h.call({ method: 'GET', url: base(), token: 'none' });
    expect([res.statusCode, res.json().code]).toEqual([410, 'link_expired']);
  });
});
