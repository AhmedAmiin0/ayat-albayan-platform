import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../core/http';
import { settingsMetaCalls } from '..';

const entry = {
  updatedAt: '2026-11-27T10:00:00+00:00',
  updatedBy: null,
  updatedByName: null,
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend: vi.fn() };
  return { client, apiFetch };
};

describe('settings meta calls', () => {
  it('reads who changed each row on the path of today', async () => {
    const { client, apiFetch } = clientAnswering({ meta: { a: entry } });
    await expect(settingsMetaCalls(client).view()).resolves.toEqual({ meta: { a: entry } });
    expect(apiFetch).toHaveBeenCalledWith('/config/meta');
  });

  it('refuses an answer outside the shared schema', async () => {
    const { client } = clientAnswering({ meta: { a: { ...entry, updatedAt: 'T' } } });
    await expect(settingsMetaCalls(client).view()).rejects.toMatchObject({
      body: { code: 'bad_response' },
    });
  });
});
