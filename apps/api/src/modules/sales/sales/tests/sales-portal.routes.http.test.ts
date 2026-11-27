import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  A,
  dirtySubscription,
  meetingRow,
  NONE,
  OWN_A,
  salesApp,
} from '@/modules/sales/sales/sales.fakes';

type App = Awaited<ReturnType<typeof salesApp>>;
const RANGE = 'from=2026-10-01T00:00:00Z&to=2026-10-31T00:00:00Z';
const SUBS = '/sales/subscriptions?kind=pending';
const MEETINGS = `/sales/meetings?${RANGE}`;
type Answer = Awaited<ReturnType<App['call']>>;
interface ErrorBody {
  code?: string;
  message?: string;
}
const codeOf = (res: Answer) => [res.statusCode, res.json<ErrorBody>()];

describe('/sales/subscriptions and /sales/meetings served from their route objects', () => {
  let t: App;
  beforeAll(async () => {
    t = await salesApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.sales.ownership.mockImplementation(async (id: string) => (id === A ? OWN_A : NONE));
  });

  it('a kind outside the list answers the validation_failed envelope; nothing read', async () => {
    const res = await t.call({
      method: 'GET',
      url: '/sales/subscriptions?kind=x',
      token: 'salesA',
    });
    expect(codeOf(res)).toEqual([400, expect.objectContaining({ message: 'validation_failed' })]);
    expect(t.sales.subscriptions).not.toHaveBeenCalled();
  });

  it('a stored subscription status outside the catalog is a 500 response_invalid', async () => {
    t.sales.subscriptions.mockResolvedValue([{ ...dirtySubscription(), status: 'gone' }]);
    const res = await t.call({ method: 'GET', url: SUBS, token: 'salesA' });
    expect(codeOf(res)).toEqual([500, expect.objectContaining({ code: 'response_invalid' })]);
  });

  it('a stored lesson status outside the catalog is a 500 response_invalid', async () => {
    t.sales.meetings.mockResolvedValue([{ ...meetingRow(), status: 'gone' }]);
    const res = await t.call({ method: 'GET', url: MEETINGS, token: 'salesA' });
    expect(codeOf(res)).toEqual([500, expect.objectContaining({ code: 'response_invalid' })]);
  });
});
