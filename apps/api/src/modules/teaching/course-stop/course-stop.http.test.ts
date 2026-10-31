import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN, NOW, REQ, SALES, STUDENT, stopApp, SUB } from './course-stop.fakes';

// «إلغاء الاشتراك» over HTTP (owner 2026-10-30): stop the course, keep the money.
type App = Awaited<ReturnType<typeof stopApp>>;
const URL = `/students/${STUDENT}/course-stop`;
const BODY = { subscriptionId: SUB, reason: 'سفر الأسرة', clientRequestId: REQ };

describe('POST /students/:id/course-stop', () => {
  let t: App;
  beforeAll(async () => {
    t = await stopApp();
  }, 60_000);
  afterAll(() => t.app.close());
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    t.reset();
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  });

  it.each([
    ['admin', ADMIN],
    ['sales', SALES],
  ])("%s stops ANY student's course in ONE call of stop_course (its key in the stamp)", async (who, actor) => {
    const res = await t.call({ method: 'POST', url: URL, token: who, body: BODY });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({
      subscriptionId: SUB,
      cancelledLessons: 3,
      endedRules: 2,
      studentStatus: 'churned',
      stoppedAt: NOW.toISOString(),
    });
    expect(t.m.repo.stop).toHaveBeenCalledTimes(1);
    expect(t.m.repo.stop).toHaveBeenCalledWith({
      subscriptionId: SUB,
      studentId: STUDENT,
      requestId: REQ,
      actorId: actor,
      reason: 'سفر الأسرة',
    });
  });

  it('after the commit: the balance alerts hear the cancelled lessons, then the money follow-ups (no 2nd audit)', async () => {
    await t.call({ method: 'POST', url: URL, token: 'sales', body: BODY });
    expect(t.m.events.changed).toHaveBeenCalledWith(['l1', 'l2', 'l3']);
    expect(t.m.writes.recorded).toHaveBeenCalledWith(
      { actorId: SALES, entity: 'subscriptions', entityId: SUB, action: 'cancel' },
      STUDENT,
    );
    const [changed] = t.m.events.changed.mock.invocationCallOrder;
    const [recorded] = t.m.writes.recorded.mock.invocationCallOrder;
    expect(Number(changed)).toBeLessThan(Number(recorded));
  });

  it.each(['teacher', 'guardian', 'assistant'])(
    '%s is refused 403 (preview and stop); nothing written',
    async (who) => {
      expect((await t.call({ method: 'POST', url: URL, token: who, body: BODY })).statusCode).toBe(
        403,
      );
      expect(
        (await t.call({ method: 'GET', url: `${URL}?subscriptionId=${SUB}`, token: who }))
          .statusCode,
      ).toBe(403);
      expect(t.m.repo.stop).not.toHaveBeenCalled();
    },
  );

  it('400: no reason, a blank one, no clientRequestId, a refund flag', async () => {
    for (const body of [
      { ...BODY, reason: undefined },
      { ...BODY, reason: '  ' },
      { ...BODY, clientRequestId: undefined },
      { ...BODY, refund: true },
    ])
      expect((await t.call({ method: 'POST', url: URL, token: 'sales', body })).statusCode).toBe(
        400,
      );
    expect(t.m.repo.stop).not.toHaveBeenCalled();
  });
});
