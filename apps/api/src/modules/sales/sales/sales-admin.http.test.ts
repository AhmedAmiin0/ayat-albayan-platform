import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { lead } from '../leads/leads.fakes';
import { A, salesApp } from './sales.fakes';

type App = Awaited<ReturnType<typeof salesApp>>;
const LEAD = '00000000-0000-4000-8000-000000000001';

describe('admin lead assignment: POST /leads/:id/assign, POST /leads/assign-unassigned, GET /sales/people', () => {
  let t: App;
  beforeAll(async () => {
    t = await salesApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.assign.isSalesperson.mockImplementation(async (id: string) => id === A);
    t.assign.setAssignee.mockImplementation(async (i: { profileId: string | null }) => lead({ assigned_to: i.profileId }));
    t.assign.salespeople.mockResolvedValue([{ id: A, full_name: 'أحمد' }]);
    t.assign.assignedLeads.mockResolvedValue([{ assigned_to: A, status: 'new', updated_at: '2026-10-01T00:00:00Z' }]);
    t.assign.unassignedLeadIds.mockResolvedValue(['l1', 'l2']);
  });
  const post = (url: string, body?: object, token: 'admin' | 'salesA' | 'teacher' = 'admin') => t.call({ method: 'POST', url, token, body });

  it('assigns a lead to a salesperson (audited) and unassigns with null', async () => {
    const res = await post(`/leads/${LEAD}/assign`, { profileId: A });
    expect([res.statusCode, res.json().assigned_to]).toEqual([200, A]);
    expect(t.assign.setAssignee).toHaveBeenCalledWith({ leadId: LEAD, profileId: A });
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'assign', entityId: LEAD }));
    expect((await post(`/leads/${LEAD}/assign`, { profileId: null })).json().assigned_to).toBeNull();
  });

  it('400 not_a_salesperson for a profile that is not sales; 400 for a bad body; 404 for an unknown lead', async () => {
    const other = await post(`/leads/${LEAD}/assign`, { profileId: '11111111-1111-4111-8111-111111111111' });
    expect([other.statusCode, other.json().code]).toEqual([400, 'not_a_salesperson']);
    expect((await post(`/leads/${LEAD}/assign`, {})).statusCode).toBe(400);
    t.assign.setAssignee.mockResolvedValue(null);
    expect((await post(`/leads/${LEAD}/assign`, { profileId: A })).statusCode).toBe(404);
  });

  it('assign-unassigned reports how many it assigned, one by one', async () => {
    t.assign.setAssignee.mockResolvedValue(lead());
    const res = await post('/leads/assign-unassigned');
    expect([res.statusCode, res.json()]).toEqual([200, { assigned: 2 }]);
    expect(t.assign.setAssignee).toHaveBeenCalledTimes(2);
    expect(t.assign.setAssignee).toHaveBeenCalledWith({ leadId: 'l1', profileId: A, onlyIfFree: true });
  });

  it('GET /sales/people lists salespeople with open lead counts', async () => {
    const res = await t.call({ method: 'GET', url: '/sales/people', token: 'admin' });
    expect(res.json()).toEqual([{ id: A, name: 'أحمد', open_leads: 1 }]);
  });

  it('admin only: a salesperson or a teacher cannot assign or list people', async () => {
    for (const token of ['salesA', 'teacher'] as const) {
      expect((await post(`/leads/${LEAD}/assign`, { profileId: A }, token)).statusCode).toBe(403);
      expect((await post('/leads/assign-unassigned', undefined, token)).statusCode).toBe(403);
      expect((await t.call({ method: 'GET', url: '/sales/people', token })).statusCode).toBe(403);
    }
    expect(t.assign.setAssignee).not.toHaveBeenCalled();
  });
});
