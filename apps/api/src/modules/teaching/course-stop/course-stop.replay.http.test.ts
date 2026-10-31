import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { conflict, notFound } from '@/common/http/errors';
import { NOW, REQ, STOPPED, STUDENT, stopApp, SUB } from './course-stop.fakes';

// «إلغاء الاشتراك» over HTTP (owner 2026-10-30): stop_course's 404 / 409s and the replay (review
// B3: the clientRequestId is written with the stamp, so a retry after a crash or a double tap
// answers the first stop instead of 409 already_cancelled).
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

  it('a double submit (same clientRequestId) answers the first stop and re-runs the idempotent follow-ups', async () => {
    t.m.repo.stop.mockResolvedValue({ ...STOPPED, replayed: true });
    const res = await t.call({ method: 'POST', url: URL, token: 'sales', body: BODY });
    expect([res.statusCode, res.json().cancelledLessons, res.json().stoppedAt]).toEqual([
      201,
      3,
      NOW.toISOString(),
    ]);
    expect(t.m.writes.recorded).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['already_cancelled', conflict('already_cancelled'), 409],
    ['course_unattributed', conflict('course_unattributed'), 409],
    ['has_future_lessons', conflict('has_future_lessons'), 409],
    ['subscription_not_found', notFound('subscription_not_found'), 404],
  ])('%s from stop_course: nothing followed up', async (code, error, status) => {
    t.m.repo.stop.mockRejectedValue(error);
    const res = await t.call({ method: 'POST', url: URL, token: 'admin', body: BODY });
    expect([res.statusCode, res.json().code]).toEqual([status, code]);
    expect(t.m.events.changed).not.toHaveBeenCalled();
    expect(t.m.writes.recorded).not.toHaveBeenCalled();
  });
});
