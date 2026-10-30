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

// «إلغاء الاشتراك» over HTTP (owner 2026-10-30): cancelled already, double submits, the preview.
type App = Awaited<ReturnType<typeof stopApp>>;
const URL = `/students/${STUDENT}/course-stop`;
const BODY = { subscriptionId: SUB, reason: 'سفر الأسرة', clientRequestId: REQ };

describe('POST /students/:id/course-stop: 409s and replays', () => {
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

  it('a cancelled package: 409 already_cancelled, nothing cancelled again', async () => {
    t.m.repo.subscription.mockResolvedValue(stamped);
    const res = await t.call({
      method: 'POST',
      url: URL,
      token: 'sales',
      body: { ...BODY, clientRequestId: 'f0000000-0000-4000-8000-0000000000f9' },
    });
    expect([res.statusCode, res.json().code]).toEqual([409, 'already_cancelled']);
    expect(t.m.cancels.stopRule).not.toHaveBeenCalled();
    expect(t.m.writes.done).not.toHaveBeenCalled();
  });

  it('a double submit (same clientRequestId) answers the first stop from its audit row', async () => {
    t.m.repo.subscription.mockResolvedValue(stamped);
    t.m.repo.replay.mockResolvedValue({
      cancelled_lessons: ['l1', 'l2'],
      ended_rules: ['r1'],
      student_status: 'churned',
    });
    const res = await t.call({ method: 'POST', url: URL, token: 'sales', body: BODY });
    expect([res.statusCode, res.json()]).toEqual([
      201,
      {
        subscriptionId: SUB,
        cancelledLessons: 2,
        endedRules: 1,
        studentStatus: 'churned',
        stoppedAt: NOW.toISOString(),
      },
    ]);
    expect(t.m.repo.replay).toHaveBeenCalledWith(SUB, REQ);
    expect(t.m.repo.stamp).not.toHaveBeenCalled();
  });

  it("a race (stamped meanwhile) replays or answers 409; the guard's has_future_lessons is a 409", async () => {
    t.m.repo.stamp.mockResolvedValueOnce(null);
    expect(
      (await t.call({ method: 'POST', url: URL, token: 'sales', body: BODY })).json().code,
    ).toBe('already_cancelled');
    t.m.repo.stamp.mockRejectedValueOnce(conflict('has_future_lessons'));
    const res = await t.call({ method: 'POST', url: URL, token: 'sales', body: BODY });
    expect([res.statusCode, res.json().code]).toEqual([409, 'has_future_lessons']);
    expect(t.m.student.churn).not.toHaveBeenCalled();
  });
});

describe('GET /students/:id/course-stop', () => {
  let t: App;
  beforeAll(async () => {
    t = await stopApp();
  }, 60_000);
  afterAll(() => t.app.close());
  beforeEach(() => t.reset());

  it('what the sheet shows: future lessons, rules, the money kept', async () => {
    const res = await t.call({
      method: 'GET',
      url: `${URL}?subscriptionId=${SUB}`,
      token: 'sales',
    });
    expect(res.json()).toEqual({
      subscriptionId: SUB,
      futureLessons: 1,
      activeRules: 2,
      paid: 290,
      currency: 'SAR',
      stopped: null,
    });
  });

  it('a stopped package shows who / when / why and nothing left to cancel', async () => {
    t.m.repo.subscription.mockResolvedValue(stamped);
    const res = await t.call({
      method: 'GET',
      url: `${URL}?subscriptionId=${SUB}`,
      token: 'admin',
    });
    expect(res.json()).toMatchObject({
      futureLessons: 0,
      activeRules: 0,
      stopped: { at: stamped.cancelled_at, by: SALES, reason: 'سفر' },
    });
    expect(subRow().status).toBe('active');
  });

  it("no subscriptionId: the student's current package (a sales file of a student not hers)", async () => {
    const res = await t.call({ method: 'GET', url: URL, token: 'sales' });
    expect([res.statusCode, res.json().subscriptionId]).toEqual([200, SUB]);
    expect(t.m.repo.current).toHaveBeenCalledWith(STUDENT);
    expect(t.m.repo.subscription).not.toHaveBeenCalled();
  });
});
