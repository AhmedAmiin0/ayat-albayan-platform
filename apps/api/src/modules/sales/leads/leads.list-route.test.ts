import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { lead } from './leads.fakes';
import { testApp } from './test-app';

let h: Awaited<ReturnType<typeof testApp>>;

beforeAll(async () => {
  h = await testApp();
});
afterAll(() => h.app.close());
beforeEach(() => vi.clearAllMocks());

const list = (url = '/leads') => h.call({ method: 'GET', url });

describe('GET /leads served from its route object', () => {
  it('answers every lead column, the follower name and the page', async () => {
    const row = lead({ follow_up_paused_by: 'lead', follow_up_note: 'no_slots' });
    h.leads.list.mockResolvedValue({ items: [row], total: 1 });
    const res = await list();
    expect(res.statusCode).toBe(200);
    const item = { ...row, assigned_to_name: null };
    expect(res.json()).toEqual({ items: [item], total: 1, page: 1, pageSize: 25 });
  });

  it('escapes the search text before the repo reads it', async () => {
    h.leads.list.mockResolvedValue({ items: [], total: 0 });
    expect((await list('/leads?q=%20%20')).statusCode).toBe(200);
    expect(h.leads.list).toHaveBeenCalledWith({ page: 1, pageSize: 25 });
  });

  it('keeps the sort, the direction and the follower filter', async () => {
    h.leads.list.mockResolvedValue({ items: [], total: 0 });
    await list('/leads?sort=name&dir=asc&assignee=none&source=facebook_ad');
    const filter = { sort: 'name', dir: 'asc', assignee: 'none', source: 'facebook_ad' };
    expect(h.leads.list).toHaveBeenCalledWith({ ...filter, page: 1, pageSize: 25 });
  });

  it('is a 500 response_invalid for a stored note or pauser outside their enums', async () => {
    for (const bad of [{ follow_up_note: 'late' }, { follow_up_paused_by: 'bot' }]) {
      h.leads.list.mockResolvedValue({ items: [lead(bad)], total: 1 });
      const res = await list();
      expect([res.statusCode, res.json().code]).toEqual([500, 'response_invalid']);
    }
  });

  it('is a 500 response_invalid for a qualification that is not an object', async () => {
    h.leads.list.mockResolvedValue({ items: [lead({ qualification: [] })], total: 1 });
    expect((await list()).statusCode).toBe(500);
  });

  it('refuses a page past the limit before anything is read', async () => {
    expect((await list('/leads?pageSize=500')).statusCode).toBe(400);
    expect(h.leads.list).not.toHaveBeenCalled();
  });
});
