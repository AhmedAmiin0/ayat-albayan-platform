import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { A, assistantApp, B } from '../assistant-pay.fakes';

type App = Awaited<ReturnType<typeof assistantApp>>;

/** A row as a careless select could return it: with the price and the actors the assistant must not get. */
const dirty = {
  id: 'c1', kind: 'first', share_percent: 100, amount: 50, currency: 'EGP', earned_at: '2026-10-29T16:42:13Z', status: 'earned',
  void_reason: null, base_amount: 180, base_currency: 'SAR', subscription_id: 'sub-1', assistant_id: A, rate: 50,
  student: { code: 'AB-1022', name: 'lmkl' }, statement: null,
  subscription: { price: 180, payments: [{ method: 'card', kind: 'payment', paid_at: '2026-10-29T16:42:13Z', amount: 180 }] },
};

describe('GET /sales/me/commissions («محفظتي»): my own commissions, one page at a time', () => {
  let t: App;
  beforeAll(async () => {
    t = await assistantApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.my.commissionPage.mockImplementation(async (id: string) => (id === A ? { rows: [dirty], total: 1 } : { rows: [], total: 0 }));
  });

  it('a page of my rows: whitelisted, with the wallet state and how it was paid; never the price', async () => {
    const res = await t.call({ method: 'GET', url: '/sales/me/commissions?page=1&pageSize=20', token: 'salesA' });
    expect(res.statusCode).toBe(200);
    expect(t.my.commissionPage).toHaveBeenCalledWith(A, { page: 1, pageSize: 20 });
    const body = res.json();
    expect(body).toMatchObject({ total: 1, page: 1, pageSize: 20 });
    expect(body.items[0]).toMatchObject({ id: 'c1', state: 'due', method: 'card', amount: 50, student: { code: 'AB-1022', name: 'lmkl' } });
    expect(res.body).not.toMatch(/base_amount|subscription_id|assistant_id|price|"rate"|180/);
  });

  it('another assistant’s id in the query string is ignored: B gets B’s (none)', async () => {
    const res = await t.call({ method: 'GET', url: `/sales/me/commissions?assistant_id=${A}&assistantId=${A}`, token: 'salesB' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ items: [], total: 0, page: 1, pageSize: 25 });
    expect(t.my.commissionPage).toHaveBeenCalledWith(B, { page: 1, pageSize: 25 });
    expect(t.my.commissionPage).not.toHaveBeenCalledWith(A, expect.anything());
  });

  it('400 for a page size over 100 or page 0; nothing read', async () => {
    for (const q of ['pageSize=101', 'page=0']) {
      expect((await t.call({ method: 'GET', url: `/sales/me/commissions?${q}`, token: 'salesA' })).statusCode).toBe(400);
    }
    expect(t.my.commissionPage).not.toHaveBeenCalled();
  });

  it('403 for the admin, a teacher and a guardian (only self.sales_earnings)', async () => {
    for (const token of ['admin', 'teacher', 'guardian'] as const) {
      expect((await t.call({ method: 'GET', url: '/sales/me/commissions', token })).statusCode).toBe(403);
    }
    expect(t.my.commissionPage).not.toHaveBeenCalled();
  });
});
