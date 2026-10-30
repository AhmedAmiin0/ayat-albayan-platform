import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { conflict } from '@/common/http/errors';
import {
  ADMIN,
  NOW,
  REQ,
  SALES,
  stamped,
  STUDENT,
  stopApp,
  SUB,
  subRow,
} from './course-stop.fakes';

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
  ])(
    "%s stops ANY student's course: rules end, lessons cancel, churned, audited",
    async (who, actor) => {
      const res = await t.call({ method: 'POST', url: URL, token: who, body: BODY });
      expect(res.statusCode).toBe(201);
      expect(res.json()).toEqual({
        subscriptionId: SUB,
        cancelledLessons: 4,
        endedRules: 2,
        studentStatus: 'churned',
        stoppedAt: NOW.toISOString(),
      });
      const by = expect.objectContaining({ id: actor });
      expect(t.m.cancels.stopRule).toHaveBeenCalledWith({
        ruleId: 'r1',
        at: NOW,
        reason: 'سفر الأسرة',
        actor: by,
      });
      expect(t.m.cancels.cancel).toHaveBeenCalledWith({
        lessonId: 'p1',
        body: { scope: 'one', by: 'admin', reason: 'سفر الأسرة' },
        actor: by,
      });
      expect(t.m.repo.stamp).toHaveBeenCalledWith({
        id: SUB,
        actorId: actor,
        reason: 'سفر الأسرة',
        now: NOW,
      });
      expect(t.m.student.churn).toHaveBeenCalledWith({
        studentId: STUDENT,
        subscriptionId: SUB,
        actorId: actor,
      });
      expect(t.m.writes.done).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: actor,
          entity: 'subscriptions',
          entityId: SUB,
          action: 'cancel',
          after: expect.objectContaining({
            kind: 'stopped',
            client_request_id: REQ,
            cancelled_lessons: ['l1', 'l2', 'l3', 'p1'],
            ended_rules: ['r1', 'r2'],
          }),
        }),
        STUDENT,
      );
    },
  );

  it('the order keeps the money path last: lessons, then the stamp, then the student, then the audit + recompute', async () => {
    await t.call({ method: 'POST', url: URL, token: 'sales', body: BODY });
    const order = [t.m.cancels.stopRule, t.m.repo.stamp, t.m.student.churn, t.m.writes.done].map(
      (f) => f.mock.invocationCallOrder[0] ?? 0,
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
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
      expect(t.m.repo.stamp).not.toHaveBeenCalled();
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
    expect(t.m.cancels.stopRule).not.toHaveBeenCalled();
  });

  it("another student's package: 404 subscription_not_found", async () => {
    const res = await t.call({
      method: 'POST',
      url: `/students/c0000000-0000-4000-8000-0000000000ff/course-stop`,
      token: 'admin',
      body: BODY,
    });
    expect([res.statusCode, res.json().code]).toEqual([404, 'subscription_not_found']);
  });
});
