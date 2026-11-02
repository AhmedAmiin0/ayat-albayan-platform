import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SALES, stamped, STUDENT, stopApp, SUB } from './course-stop.fakes';

// «إلغاء الاشتراك»'s confirm sheet: course_stop_plan's counts, the money kept, who stopped it.
type App = Awaited<ReturnType<typeof stopApp>>;
const URL = `/students/${STUDENT}/course-stop`;

describe('GET /students/:id/course-stop', () => {
  let t: App;
  beforeAll(async () => {
    t = await stopApp();
  }, 60_000);
  afterAll(() => t.app.close());
  beforeEach(() => t.reset());

  it('what the sheet shows: future lessons, rules (also those without subscription_id), the money kept', async () => {
    const res = await t.call({ method: 'GET', url: `${URL}?subscriptionId=${SUB}`, token: 'sales' });
    expect(res.json()).toEqual({
      subscriptionId: SUB,
      futureLessons: 1,
      activeRules: 2,
      paid: 290,
      currency: 'SAR',
      stopped: null,
    });
  });

  it('a running rule it cannot attribute: 409 course_unattributed before the sheet opens', async () => {
    t.m.repo.plan.mockResolvedValue({ rule_ids: ['g1'], lessons: [], unattributed: true });
    const res = await t.call({ method: 'GET', url: `${URL}?subscriptionId=${SUB}`, token: 'admin' });
    expect([res.statusCode, res.json().code]).toEqual([409, 'course_unattributed']);
  });

  it('a stopped package shows who / when / why and nothing left to cancel', async () => {
    t.m.repo.subscription.mockResolvedValue(stamped);
    const res = await t.call({ method: 'GET', url: `${URL}?subscriptionId=${SUB}`, token: 'admin' });
    expect(res.json()).toMatchObject({
      futureLessons: 0,
      activeRules: 0,
      stopped: { at: stamped.cancelled_at, by: SALES, reason: 'سفر' },
    });
  });

  it("no subscriptionId: the student's current package (a sales file of a student not hers)", async () => {
    const res = await t.call({ method: 'GET', url: URL, token: 'sales' });
    expect([res.statusCode, res.json().subscriptionId]).toEqual([200, SUB]);
    expect(t.m.repo.current).toHaveBeenCalledWith(STUDENT);
    expect(t.m.repo.subscription).not.toHaveBeenCalled();
  });
});
