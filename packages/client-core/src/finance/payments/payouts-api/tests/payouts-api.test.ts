import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { payoutCalls } from '../payouts-api';

const ID = '00000000-0000-4000-8000-0000000000e1';
const payout = {
  id: ID,
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
  return { client, apiFetch, apiSend };
};

describe('payoutCalls: reads', () => {
  it('reads a month of payouts and the signed-in teacher own ones', async () => {
    const { client, apiFetch } = clientAnswering([payout]);
    await expect(payoutCalls(client).month('2026-09')).resolves.toEqual([payout]);
    expect(apiFetch).toHaveBeenCalledWith('/payouts?month=2026-09');
    await payoutCalls(client).mine();
    expect(apiFetch).toHaveBeenLastCalledWith('/teachers/me/payouts');
  });

  it('reads a payout receipt link', async () => {
    const link = { url: 'https://files.example/r.pdf', expires_at: 'e' };
    const { client, apiFetch } = clientAnswering(link);
    await expect(payoutCalls(client).receipt(ID)).resolves.toEqual(link);
    expect(apiFetch).toHaveBeenCalledWith(`/payouts/${ID}/receipt`);
  });

  it('throws bad_response for a payout in another currency', async () => {
    const { client } = clientAnswering([{ ...payout, currency: 'USD' }]);
    const error: unknown = await payoutCalls(client).month('2026-09').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'bad_response' });
  });
});

describe('payoutCalls: moves', () => {
  it('generates a month and moves a payout along its statuses', async () => {
    const { client, apiSend } = clientAnswering(payout);
    const calls = payoutCalls(client);
    await calls.approve(ID);
    expect(apiSend).toHaveBeenLastCalledWith('POST', `/payouts/${ID}/approve`, undefined);
    await calls.reopen(ID);
    expect(apiSend).toHaveBeenLastCalledWith('POST', `/payouts/${ID}/reopen`, undefined);
    await calls.unpay(ID, 'paid twice');
    expect(apiSend).toHaveBeenLastCalledWith('POST', `/payouts/${ID}/unpay`, {
      reason: 'paid twice',
    });
  });

  it('pays a payout with its receipt', async () => {
    const { client, apiSend } = clientAnswering(payout);
    const body = { method: 'bank', note: null, receiptPath: null } as const;
    await payoutCalls(client).pay(ID, body);
    expect(apiSend).toHaveBeenCalledWith('POST', `/payouts/${ID}/pay`, body);
  });

  it('generates the drafts of a month', async () => {
    const result = { month: '2026-09', payouts: [payout], missing_rates: [] };
    const { client, apiSend } = clientAnswering(result);
    await expect(payoutCalls(client).generate('2026-09')).resolves.toEqual(result);
    expect(apiSend).toHaveBeenCalledWith('POST', '/payouts/2026-09/generate', undefined);
  });
});
