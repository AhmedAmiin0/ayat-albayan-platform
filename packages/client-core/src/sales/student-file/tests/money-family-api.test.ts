import { salesFamilyStudent } from '@ab/shared/testing';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { salesMoneyFamilyCalls } from '../money-family-api';

const PHONE = '+966551110000';

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend: vi.fn() };
  return { client, apiFetch };
};

describe('sales money family call', () => {
  it('reads the chat family on the path of today', async () => {
    const answer = { students: [salesFamilyStudent()] };
    const { client, apiFetch } = clientAnswering(answer);
    await expect(salesMoneyFamilyCalls(client).family({ phone: PHONE })).resolves.toEqual(answer);
    expect(apiFetch).toHaveBeenCalledWith(`/sales/money/family?phone=${encodeURIComponent(PHONE)}`);
  });

  it('throws bad_response for a child with an unknown status', async () => {
    const answer = { students: [{ ...salesFamilyStudent(), status: 'gone' }] };
    const { client } = clientAnswering(answer);
    const failure = await salesMoneyFamilyCalls(client)
      .family({ phone: PHONE })
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
