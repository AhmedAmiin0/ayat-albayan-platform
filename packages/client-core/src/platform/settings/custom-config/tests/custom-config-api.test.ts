import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../core/http';
import { customConfigCalls } from '..';

const VIEW = {
  key: 'promo',
  value: 'hi',
  description: null,
  isPublic: true,
  updatedAt: '2026-10-05T00:00:00+00:00',
  updatedBy: null,
};

const clientAnswering = (answer: unknown): ApiClient => ({
  apiFetch: vi.fn(async () => answer),
  apiSend: vi.fn(async () => answer),
});

describe('custom config calls', () => {
  it('reads every entry on the path of today', async () => {
    const client = clientAnswering([VIEW]);
    await expect(customConfigCalls(client).list()).resolves.toEqual([VIEW]);
    expect(client.apiFetch).toHaveBeenCalledWith('/config/custom');
  });

  it('saves and deletes one entry by its key', async () => {
    const client = clientAnswering(VIEW);
    const calls = customConfigCalls(client);
    await expect(calls.put({ key: 'promo', body: { value: 'hi' } })).resolves.toEqual(VIEW);
    vi.mocked(client.apiSend).mockResolvedValueOnce(undefined);
    await calls.remove('promo.banner');
    const sent = { value: 'hi' };
    expect(client.apiSend).toHaveBeenNthCalledWith(1, 'PUT', '/config/custom/promo', sent);
    const removed = '/config/custom/promo.banner';
    expect(client.apiSend).toHaveBeenNthCalledWith(2, 'DELETE', removed, undefined);
  });

  it('refuses an answer outside the shared schema', async () => {
    const client = clientAnswering([{ ...VIEW, updatedAt: 'yesterday' }]);
    await expect(customConfigCalls(client).list()).rejects.toMatchObject({
      body: { code: 'bad_response' },
    });
  });
});
