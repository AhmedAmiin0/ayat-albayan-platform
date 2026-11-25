import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { academyApp, SUB } from '@/modules/sales/sales/academy/sales-academy.fakes';

type App = Awaited<ReturnType<typeof academyApp>>;
const HISTORY = `/sales/subscriptions/${SUB}/history`;
const UNKNOWN = '/sales/subscriptions/c1000000-0000-4000-8000-0000000000ff/history';

// Every salesperson reads any subscription's history (docs/16 row 2, «all assistants see all»);
// the logins outside sales are refused before the subscription is looked up.
describe('GET /sales/subscriptions/:id/history with someone else\'s subscription id', () => {
  let t: App;
  beforeAll(async () => {
    t = await academyApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => vi.clearAllMocks());

  it('a teacher, guardian, admin or classroom assistant is 403 and nothing is read', async () => {
    for (const token of ['teacher', 'guardian', 'admin', 'assistant'] as const) {
      expect([token, (await t.get(HISTORY, token)).statusCode]).toEqual([token, 403]);
    }
    expect(t.history.studentOf).not.toHaveBeenCalled();
    expect(t.history.history).not.toHaveBeenCalled();
  });

  it('an unknown subscription id is 404 subscription_not_found; no history is read', async () => {
    const res = await t.get(UNKNOWN, 'salesB');
    expect([res.statusCode, res.json().code]).toEqual([404, 'subscription_not_found']);
    expect(t.history.history).not.toHaveBeenCalled();
  });
});
