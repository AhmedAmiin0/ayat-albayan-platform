import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { REQ, stopApp, SUB } from './course-stop.fakes';

// The package named in the query or body must be the path student's (CourseStopRepo.subscription):
// SUB is STUDENT's, so under another student's path it is 404 before anything else is read.
type App = Awaited<ReturnType<typeof stopApp>>;
const OTHER_STUDENT = '5a000000-0000-4000-8000-0000000000a9';
const URL = `/students/${OTHER_STUDENT}/course-stop`;
const BODY = { subscriptionId: SUB, reason: 'سفر', clientRequestId: REQ };

describe("/students/:id/course-stop with another student's package", () => {
  let t: App;
  beforeAll(async () => {
    t = await stopApp();
  }, 60_000);
  afterAll(() => t.app.close());
  beforeEach(() => t.reset());

  it("another student's package preview is 404; its plan and money are not read", async () => {
    for (const token of ['sales', 'admin']) {
      const url = `${URL}?subscriptionId=${SUB}`;
      const res = await t.call({ method: 'GET', url, token });
      expect([token, res.statusCode, res.json().code]).toEqual([
        token,
        404,
        'subscription_not_found',
      ]);
    }
    expect(t.m.repo.plan).not.toHaveBeenCalled();
    expect(t.m.repo.paid).not.toHaveBeenCalled();
    expect(t.m.refunds.money).not.toHaveBeenCalled();
  });

  it("another student's package stop is 404; nothing stopped, recorded or refunded", async () => {
    for (const token of ['sales', 'admin']) {
      const res = await t.call({ method: 'POST', url: URL, token, body: BODY });
      expect([token, res.statusCode, res.json().code]).toEqual([
        token,
        404,
        'subscription_not_found',
      ]);
    }
    expect(t.m.repo.stop).not.toHaveBeenCalled();
    expect(t.m.events.changed).not.toHaveBeenCalled();
    expect(t.m.writes.recorded).not.toHaveBeenCalled();
    expect(t.m.payments.create).not.toHaveBeenCalled();
  });
});
