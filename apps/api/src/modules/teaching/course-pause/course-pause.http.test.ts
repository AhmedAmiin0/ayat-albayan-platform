import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN, PAUSE, pauseApp, SALES, STUDENT } from './course-pause.fakes';

type App = Awaited<ReturnType<typeof pauseApp>>;
// 2026-10-28 23:30 Riyadh: the business day is the 28th (UTC is still the 28th 20:30).
const NOW = new Date('2026-10-28T20:30:00Z');
const URL = `/students/${STUDENT}/course-pause`;

describe('course pause routes «إيقاف الدورة مؤقتًا» (owner 2026-10-28, docs/11 §7b)', () => {
  let t: App;
  beforeAll(async () => {
    t = await pauseApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    t.reset();
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  });
  afterEach(() => vi.useRealTimers());

  it('sales pauses ANY student: from defaults to Riyadh today, until open-ended; she is the actor; counts come back', async () => {
    const res = await t.call({ method: 'POST', url: URL, token: 'sales', body: { reason: 'سفر الأسرة' } });
    expect(res.statusCode).toBe(201);
    expect(t.m.queries.call).toHaveBeenCalledWith('course_pause_start', {
      student_id: STUDENT, from_date: '2026-10-28', until_date: null, reason: 'سفر الأسرة', actor: SALES,
    });
    expect(t.m.follow.after).toHaveBeenCalledWith(expect.objectContaining({ id: PAUSE }), SALES);
    expect(res.json()).toMatchObject({ cancelled: 2, left: 1, reopened: 0, conflicts: 0, pause: { id: PAUSE, created_by_name: 'سارة' } });
  });

  it('the admin pauses with a window', async () => {
    const body = { fromDate: '2026-11-01', untilDate: '2026-11-10' };
    expect((await t.call({ method: 'POST', url: URL, token: 'admin', body })).statusCode).toBe(201);
    expect(t.m.queries.call).toHaveBeenCalledWith('course_pause_start', expect.objectContaining({ from_date: '2026-11-01', until_date: '2026-11-10', actor: ADMIN }));
  });

  it('a past start is 400 date_in_past and an until before it 400 invalid_range; nothing is written', async () => {
    const past = await t.call({ method: 'POST', url: URL, token: 'sales', body: { fromDate: '2026-10-27' } });
    expect([past.statusCode, past.json().code]).toEqual([400, 'date_in_past']);
    const range = await t.call({ method: 'POST', url: URL, token: 'sales', body: { fromDate: '2026-11-05', untilDate: '2026-11-01' } });
    expect([range.statusCode, range.json().code]).toEqual([400, 'invalid_range']);
    expect(t.m.queries.call).not.toHaveBeenCalled();
  });

  it('a strict body: chargeable or a message flag is 400', async () => {
    expect((await t.call({ method: 'POST', url: URL, token: 'sales', body: { chargeable: true } })).statusCode).toBe(400);
    expect(t.m.queries.call).not.toHaveBeenCalled();
  });

  it('teachers and classroom assistants are refused 403 on every route', async () => {
    for (const token of ['teacher', 'assistant'] as const) {
      expect((await t.call({ method: 'POST', url: URL, token })).statusCode).toBe(403);
      expect((await t.call({ method: 'GET', url: URL, token })).statusCode).toBe(403);
      expect((await t.call({ method: 'POST', url: `${URL}/resume`, token })).statusCode).toBe(403);
    }
    expect(t.m.queries.call).not.toHaveBeenCalled();
  });

  it('preview counts the open lessons from max(now, Riyadh start of from) to the Riyadh start of the day after until', async () => {
    const res = await t.call({ method: 'GET', url: `${URL}/preview?from=2026-11-01&until=2026-11-10`, token: 'sales' });
    expect(res.json()).toEqual({ from_date: '2026-11-01', until_date: '2026-11-10', lessons: 3 });
    expect(t.m.queries.previewCount).toHaveBeenCalledWith({
      studentId: STUDENT, start: new Date('2026-10-31T21:00:00Z'), end: new Date('2026-11-10T21:00:00Z'),
    });
    await t.call({ method: 'GET', url: `${URL}/preview`, token: 'sales' });
    expect(t.m.queries.previewCount).toHaveBeenLastCalledWith({ studentId: STUDENT, start: NOW, end: null });
  });

  it('a past preview start is 400; an unknown student 404 student_not_found', async () => {
    expect((await t.call({ method: 'GET', url: `${URL}/preview?from=2026-10-01`, token: 'sales' })).json().code).toBe('date_in_past');
    t.m.queries.studentExists.mockResolvedValue(false);
    const res = await t.call({ method: 'GET', url: URL, token: 'admin' });
    expect([res.statusCode, res.json().code]).toEqual([404, 'student_not_found']);
  });

  it('GET answers the open pause and the history apart', async () => {
    const res = await t.call({ method: 'GET', url: URL, token: 'sales' });
    expect(res.json().open.id).toBe(PAUSE);
    expect(res.json().history.map((h: { id: string; extended_days: number }) => [h.id, h.extended_days])).toEqual([['old', 7]]);
  });

  it('resume resumes the open pause now; without one 409 pause_not_open', async () => {
    t.m.queries.call.mockResolvedValue({ id: PAUSE, student_id: STUDENT, resumed: true, days: 4, cancelled: [], left: [], reopened: ['l9'], rejoined: [], rule_ids: ['r1'] });
    t.m.follow.after.mockResolvedValue(1);
    const res = await t.call({ method: 'POST', url: `${URL}/resume`, token: 'sales' });
    expect([res.statusCode, res.json().reopened, res.json().conflicts]).toEqual([200, 1, 1]);
    expect(t.m.queries.call).toHaveBeenCalledWith('course_pause_resume', { pause_id: PAUSE, actor: SALES });
    t.m.queries.openPauseId.mockResolvedValue(null);
    const none = await t.call({ method: 'POST', url: `${URL}/resume`, token: 'sales' });
    expect([none.statusCode, none.json().code]).toEqual([409, 'pause_not_open']);
  });

  it('a package paused by the old package-only button (no pause row) is lifted by the same «استئناف»', async () => {
    t.m.queries.openPauseId.mockResolvedValue(null);
    t.m.queries.liftLegacyPause.mockResolvedValue('sub-old');
    const res = await t.call({ method: 'POST', url: `${URL}/resume`, token: 'admin' });
    expect([res.statusCode, res.json().cancelled, res.json().reopened]).toEqual([200, 0, 0]);
    expect(t.m.follow.liftedLegacy).toHaveBeenCalledWith({ studentId: STUDENT, subscriptionId: 'sub-old', actorId: ADMIN });
    expect(t.m.queries.call).not.toHaveBeenCalled();
  });

  it('PATCH until extends the open pause (null = until «استئناف»)', async () => {
    const res = await t.call({ method: 'PATCH', url: `${URL}/until`, token: 'admin', body: { untilDate: null } });
    expect(res.statusCode).toBe(200);
    expect(t.m.queries.call).toHaveBeenCalledWith('course_pause_set_until', { pause_id: PAUSE, until_date: null, actor: ADMIN });
  });
});
