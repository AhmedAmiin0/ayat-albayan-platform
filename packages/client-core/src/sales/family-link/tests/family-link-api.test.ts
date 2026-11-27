import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { leadFamilyCalls } from '../family-link-api';

const ID = '11111111-1111-4111-8111-111111111111';

const clientAnswering = (answer: unknown) => {
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch: vi.fn(), apiSend };
  return { client, apiSend };
};

describe('lead family calls', () => {
  it('posts the code as typed on the path of today; the api trims it', async () => {
    const { client, apiSend } = clientAnswering({ linked: true });
    await expect(leadFamilyCalls(client).link({ leadId: ID, code: ' ab-0183 ' })).resolves.toEqual({
      linked: true,
    });
    expect(apiSend).toHaveBeenCalledWith('POST', `/leads/${ID}/link-family`, { code: ' ab-0183 ' });
  });

  it('throws bad_response for an answer with more than { linked }', async () => {
    const { client } = clientAnswering({ linked: true, phone: '+966500000000' });
    const failure = await leadFamilyCalls(client)
      .link({ leadId: ID, code: 'AB-0183' })
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
