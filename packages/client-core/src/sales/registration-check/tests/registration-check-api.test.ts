import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { registrationCheckCalls } from '../registration-check-api';

const MATCH = { name: 'سهيلة', code: 'AB-1001', status: 'active', teacher_name: null };
const VIEW = { found: true, matches: [MATCH], more: false };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend: vi.fn() };
  return { client, apiFetch };
};

describe('registration check calls', () => {
  it('reads by phone on the path of today', async () => {
    const { client, apiFetch } = clientAnswering(VIEW);
    await expect(registrationCheckCalls(client).check({ phone: '+966551110000' })).resolves.toEqual(
      VIEW,
    );
    expect(apiFetch).toHaveBeenCalledWith('/sales/registration-check?phone=%2B966551110000');
  });

  it('reads by a name or code', async () => {
    const { client, apiFetch } = clientAnswering({ found: false, matches: [], more: false });
    await registrationCheckCalls(client).check({ q: 'AB-1001' });
    expect(apiFetch).toHaveBeenCalledWith('/sales/registration-check?q=AB-1001');
  });

  it('throws bad_response for a child with more than the four keys', async () => {
    const leaky = { ...VIEW, matches: [{ ...MATCH, phone: '+966500000000' }] };
    const failure = await registrationCheckCalls(clientAnswering(leaky).client)
      .check({ q: 'AB-1001' })
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
