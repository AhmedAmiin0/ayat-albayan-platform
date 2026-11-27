import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { mySalesCalls } from '../my-sales-api';

const ID = '00000000-0000-4000-8000-0000000000c1';

const payment = {
  id: ID,
  student: { id: ID, code: 'AB-0001', name: 'S' },
  kind: 'payment',
  amount: 400,
  currency: 'SAR',
  method: 'cash',
  paid_at: '2026-10-02T08:00:00.000Z',
  note: null,
};

const earnings = {
  terms: null,
  this_month: {},
  commissions_total: {},
  wallet: { SAR: { due: 40, paid: 0, this_month: 40 } },
  statements: [],
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch };
};

describe('mySalesCalls: the signed-in assistant', () => {
  it('reads the own students, earnings and payments under /sales/me', async () => {
    const { client, apiFetch } = clientAnswering([]);
    await mySalesCalls(client).students();
    await mySalesCalls(client).payments();
    expect(apiFetch.mock.calls).toEqual([['/sales/me/students'], ['/sales/me/payments']]);
    const { client: c2, apiFetch: f2 } = clientAnswering(earnings);
    await expect(mySalesCalls(c2).earnings()).resolves.toEqual(earnings);
    expect(f2).toHaveBeenCalledWith('/sales/me/earnings');
  });

  it('pages the own commissions with the page and size it is given', async () => {
    const { client, apiFetch } = clientAnswering({ items: [], total: 0, page: 2, pageSize: 20 });
    await mySalesCalls(client).commissions({ page: 2, pageSize: 20 });
    expect(apiFetch).toHaveBeenCalledWith('/sales/me/commissions?page=2&pageSize=20');
  });

  it('throws bad_response for a payment of an unknown method', async () => {
    const { client } = clientAnswering([{ ...payment, method: 'cheque' }]);
    const error: unknown = await mySalesCalls(client)
      .payments()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ body: { code: 'bad_response' } });
  });
});
