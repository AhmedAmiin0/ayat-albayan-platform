import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { myPayoutCalls } from '../my-payouts-api';

const payout = {
  id: '00000000-0000-4000-8000-0000000000e1',
  teacher: { id: '00000000-0000-4000-8000-0000000000e2', display_name_ar: 'T' },
  month: '2026-09',
  lessons_count: 2,
  amount: 140,
  currency: 'EGP',
  status: 'approved',
  approved_at: '2026-10-01T08:00:00.000Z',
  paid_at: null,
  breakdown: { lines: [], lesson_ids: [], statuses: [] },
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch };
};

describe('myPayoutCalls: the signed-in teacher', () => {
  it('reads the teacher own payouts under /teachers/me/payouts', async () => {
    const { client, apiFetch } = clientAnswering([payout]);
    await expect(myPayoutCalls(client).list()).resolves.toEqual([payout]);
    expect(apiFetch).toHaveBeenCalledWith('/teachers/me/payouts');
  });

  it('throws bad_response for a payout in another currency', async () => {
    const { client } = clientAnswering([{ ...payout, currency: 'USD' }]);
    const error: unknown = await myPayoutCalls(client).list().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ body: { code: 'bad_response' } });
  });
});
