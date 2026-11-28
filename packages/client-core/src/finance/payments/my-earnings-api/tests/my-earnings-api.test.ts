import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { myEarningCalls } from '../my-earnings-api';

const TEACHER = '00000000-0000-4000-8000-00000000000a';
const PAYMENT = '00000000-0000-4000-8000-00000000000b';
const totals = { earned: 120, paid: 120, outstanding: 0, overpaid: 0, sessions: 4 };
const balance = {
  ...totals,
  unpaid_sessions: 0,
  teacher: { id: TEACHER, display_name_ar: 'T' },
  currency: 'EGP',
};
const page = { items: [], total: 0, page: 1, pageSize: 20 };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch };
};

describe('myEarningCalls: the signed-in teacher', () => {
  it('reads the balance under /teachers/me/earnings', async () => {
    const { client, apiFetch } = clientAnswering(balance);
    await expect(myEarningCalls(client).balance()).resolves.toEqual(balance);
    expect(apiFetch).toHaveBeenCalledWith('/teachers/me/earnings');
  });

  it('reads the sessions and the payments with their query', async () => {
    const { client, apiFetch } = clientAnswering(page);
    const calls = myEarningCalls(client);
    await calls.sessions({ status: 'unpaid', page: 1, pageSize: 20 });
    await calls.payments({ sort: 'amount', page: 2, pageSize: 20 });
    expect(apiFetch.mock.calls).toEqual([
      ['/teachers/me/earnings/sessions?status=unpaid&page=1&pageSize=20'],
      ['/teachers/me/earnings/payments?sort=amount&page=2&pageSize=20'],
    ]);
  });

  it('reads a receipt through the teacher own path', async () => {
    const link = { url: 'https://files.example/r.pdf', expires_at: '2026-10-01T08:05:00Z' };
    const { client, apiFetch } = clientAnswering(link);
    await expect(myEarningCalls(client).receipt(PAYMENT)).resolves.toEqual(link);
    expect(apiFetch).toHaveBeenCalledWith(`/teachers/me/earnings/payments/${PAYMENT}/receipt`);
  });

  it('refuses a balance without its teacher', async () => {
    const { client } = clientAnswering(totals);
    const failure = await myEarningCalls(client)
      .balance()
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
