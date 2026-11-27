import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { assistantPayCalls } from '../assistant-pay-api';

const A = '00000000-0000-4000-8000-0000000000a1';
const S = '00000000-0000-4000-8000-0000000000a2';
const terms = { assistant_id: A, commission: null, salary: null, renewal_share_percent: 50 };
const commission = {
  id: S,
  assistant: { id: A, name: 'A' },
  student: { id: S, code: 'AB-0001', name: 'S' },
  subscription_id: null,
  kind: 'first',
  share_percent: 100,
  type: 'percent',
  rate: 10,
  base_amount: 400,
  base_currency: 'SAR',
  amount: 40,
  currency: 'SAR',
  earned_at: '2026-10-01T08:00:00.000Z',
  status: 'earned',
  void_reason: null,
  voided_at: null,
  statement_id: null,
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('assistantPayCalls: reads', () => {
  it('reads every assistant terms and who brought a student', async () => {
    const { client, apiFetch } = clientAnswering([{ ...terms, name: 'A' }]);
    await assistantPayCalls(client).terms();
    expect(apiFetch).toHaveBeenLastCalledWith('/assistant-pay/terms');
    apiFetch.mockResolvedValueOnce({ assistant: null, brought_at: null });
    await assistantPayCalls(client).broughtByOf(S);
    expect(apiFetch).toHaveBeenLastCalledWith(`/assistant-pay/brought-by/${S}`);
  });

  it('reads the ledger with only the filters given', async () => {
    const { client, apiFetch } = clientAnswering([commission]);
    const from = '2026-10-01T00:00:00.000Z';
    await expect(assistantPayCalls(client).ledger({ assistantId: A, from })).resolves.toEqual([
      commission,
    ]);
    expect(apiFetch).toHaveBeenCalledWith(
      `/assistant-pay/commissions?assistantId=${A}&from=2026-10-01T00%3A00%3A00.000Z`,
    );
  });

  it('throws bad_response for a commission of an unknown status', async () => {
    const { client } = clientAnswering([{ ...commission, status: 'paid' }]);
    const error: unknown = await assistantPayCalls(client)
      .ledger({})
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ body: { code: 'bad_response' } });
  });
});

describe('assistantPayCalls: writes', () => {
  it('saves terms with PUT and voids a commission with its reason', async () => {
    const { client, apiSend } = clientAnswering(terms);
    const body = { commission: null, salary: null };
    await assistantPayCalls(client).saveTerms(A, body);
    expect(apiSend).toHaveBeenLastCalledWith('PUT', `/assistant-pay/terms/${A}`, body);
    apiSend.mockResolvedValueOnce({ id: S });
    await assistantPayCalls(client).voidCommission(S, 'counted twice');
    expect(apiSend).toHaveBeenLastCalledWith('POST', `/assistant-pay/commissions/${S}/void`, {
      reason: 'counted twice',
    });
  });

  it('sets who brought students with POST /assistant-pay/brought-by', async () => {
    const { client, apiSend } = clientAnswering({ changed: 1 });
    const body = { studentIds: [S], assistantId: A };
    await expect(assistantPayCalls(client).setBroughtBy(body)).resolves.toEqual({ changed: 1 });
    expect(apiSend).toHaveBeenCalledWith('POST', '/assistant-pay/brought-by', body);
  });
});
