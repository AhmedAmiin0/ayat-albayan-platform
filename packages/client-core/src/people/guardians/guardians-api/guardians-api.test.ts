import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { guardianCalls } from './guardians-api';

const ID = '11111111-1111-4111-8111-111111111111';
const guardian = {
  id: ID,
  name: 'أم سهيلة',
  phone_e164: '+966501234567',
  country: 'SA',
  tz: 'Asia/Riyadh',
  source: null,
  notes: null,
  profile_id: null,
  created_by: null,
  created_at: '2026-10-03T09:00:00.000Z',
  updated_at: '2026-10-03T09:00:00.000Z',
};
const detail = { ...guardian, students: [], phones: [] };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('guardian calls (R-STU-02, R-STU-04)', () => {
  it('reads GET /guardians/:id', async () => {
    const { client, apiFetch } = clientAnswering(detail);
    await expect(guardianCalls(client).get(ID)).resolves.toEqual(detail);
    expect(apiFetch).toHaveBeenCalledWith(`/guardians/${ID}`);
  });

  it('sends PATCH /guardians/:id with the patch', async () => {
    const { client, apiSend } = clientAnswering(guardian);
    await expect(guardianCalls(client).update(ID, { name: 'أم جود' })).resolves.toEqual(guardian);
    expect(apiSend).toHaveBeenCalledWith('PATCH', `/guardians/${ID}`, { name: 'أم جود' });
  });

  it('removes the second number with the + encoded', async () => {
    const { client, apiSend } = clientAnswering(undefined);
    await guardianCalls(client).removePhone({ id: ID, phone: '+966552220000' });
    const url = `/guardians/${ID}/phones/%2B966552220000`;
    expect(apiSend).toHaveBeenCalledWith('DELETE', url, undefined);
  });

  it('throws bad_response for a guardian without its numbers', async () => {
    const { client } = clientAnswering(guardian);
    const failure = await guardianCalls(client)
      .get(ID)
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response', path: `/guardians/${ID}` } });
  });
});
