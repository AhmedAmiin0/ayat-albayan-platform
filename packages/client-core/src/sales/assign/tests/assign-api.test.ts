import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { salesAssignCalls } from '../assign-api';

const PERSON = { id: '11111111-1111-4111-8111-111111111111', name: 'سارة', open_leads: 1 };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('sales assign calls', () => {
  it('reads the salespeople on the path of today', async () => {
    const { client, apiFetch } = clientAnswering([PERSON]);
    await expect(salesAssignCalls(client).people()).resolves.toEqual([PERSON]);
    expect(apiFetch).toHaveBeenCalledWith('/sales/people');
  });

  it('posts the spread of ownerless leads with no body', async () => {
    const { client, apiSend } = clientAnswering({ assigned: 4 });
    await expect(salesAssignCalls(client).assignUnassigned()).resolves.toEqual({ assigned: 4 });
    expect(apiSend).toHaveBeenCalledWith('POST', '/leads/assign-unassigned', undefined);
  });

  it('throws bad_response for a person row beyond the contract', async () => {
    const { client } = clientAnswering([{ ...PERSON, phone: '+966500000000' }]);
    const failure = await salesAssignCalls(client)
      .people()
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
