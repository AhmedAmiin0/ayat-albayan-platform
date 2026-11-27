import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { salesPortalCalls } from '../sales-portal-api';

const SUB = {
  id: 'sub-1',
  student: { id: 's1', code: 'AB-0101', name: 'ياسمين' },
  package: '8',
  status: 'unpaid',
  starts_on: '2026-10-01',
  lessons_total: 8,
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend: vi.fn() };
  return { client, apiFetch };
};

describe('the salesperson portal calls', () => {
  it('reads one kind of my subscriptions on the path of today', async () => {
    const { client, apiFetch } = clientAnswering([SUB]);
    await expect(salesPortalCalls(client).subscriptions('pending')).resolves.toEqual([SUB]);
    expect(apiFetch).toHaveBeenCalledWith('/sales/subscriptions?kind=pending');
  });

  it('throws bad_response for a row whose status is outside the catalog', async () => {
    const { client } = clientAnswering([{ ...SUB, status: 'gone' }]);
    const failure = await salesPortalCalls(client)
      .subscriptions('confirmed')
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
