import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PAUSE, pauseApp, STUDENT } from './course-pause.fakes';

type App = Awaited<ReturnType<typeof pauseApp>>;
const URL = `/students/${STUDENT}/course-pause/resume-preview`;

// The resume confirmation states the lessons booked back and how far the package moves.
describe('GET /students/:id/course-pause/resume-preview', () => {
  let t: App;
  beforeAll(async () => {
    t = await pauseApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => t.reset());
  afterEach(() => vi.useRealTimers());

  it('a started pause (1–10 Nov) resumed on the 5th: the lessons back and 4 days', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-05T06:00:00Z'), toFake: ['Date'] });
    const res = await t.call({ method: 'GET', url: URL, token: 'sales' });
    expect(res.json()).toEqual({ back: ['2026-11-04T14:00:00Z'], extendDays: 4 });
    expect(t.m.queries.pausedBack).toHaveBeenCalledWith(PAUSE, new Date('2026-11-04T21:00:00Z'));
    expect(t.m.queries.call).not.toHaveBeenCalled();
  });

  it('a pause that has not started yet moves nothing', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-28T06:00:00Z'), toFake: ['Date'] });
    const res = await t.call({ method: 'GET', url: URL, token: 'admin' });
    expect(res.json().extendDays).toBe(0);
  });

  it('no open pause: 409 pause_not_open; teachers 403', async () => {
    t.m.queries.openPause.mockResolvedValue(null);
    const res = await t.call({ method: 'GET', url: URL, token: 'admin' });
    expect([res.statusCode, res.json().code]).toEqual([409, 'pause_not_open']);
    expect((await t.call({ method: 'GET', url: URL, token: 'teacher' })).statusCode).toBe(403);
  });
});
