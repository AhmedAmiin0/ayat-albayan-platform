import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { A, salesApp } from '@/modules/sales/sales/sales.fakes';

type App = Awaited<ReturnType<typeof salesApp>>;

describe('/sales/people and /leads/assign-unassigned served from their route objects', () => {
  let t: App;
  beforeAll(async () => {
    t = await salesApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.assign.assignedLeads.mockResolvedValue([]);
    t.assign.unassignedLeadIds.mockResolvedValue([]);
  });

  it('a salesperson row that is not a uuid is a 500 response_invalid, never sent', async () => {
    t.assign.salespeople.mockResolvedValue([{ id: 'not-a-uuid', full_name: 'أحمد' }]);
    const res = await t.call({ method: 'GET', url: '/sales/people', token: 'admin' });
    expect([res.statusCode, res.json()]).toEqual([
      500,
      expect.objectContaining({ code: 'response_invalid' }),
    ]);
  });

  it('a salesperson with no open lead answers a zero count', async () => {
    t.assign.salespeople.mockResolvedValue([{ id: A, full_name: 'أحمد' }]);
    const res = await t.call({ method: 'GET', url: '/sales/people', token: 'admin' });
    expect([res.statusCode, res.json()]).toEqual([200, [{ id: A, name: 'أحمد', open_leads: 0 }]]);
  });

  it('nothing ownerless answers zero assigned with a 200', async () => {
    const res = await t.call({ method: 'POST', url: '/leads/assign-unassigned', token: 'admin' });
    expect([res.statusCode, res.json()]).toEqual([200, { assigned: 0 }]);
  });
});
