import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { pushTokenCalls } from './push-tokens-api';

const TOKEN = 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]';
const KEY = 'k'.repeat(43);

const clientAnswering = (answer: unknown) => {
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch: vi.fn(), apiSend };
  return { client, apiSend };
};

describe('pushTokenCalls (R-MOB-01)', () => {
  it('PUTs the token and answers the device key', async () => {
    const { client, apiSend } = clientAnswering({ deviceKey: KEY });
    await expect(pushTokenCalls(client).add({ token: TOKEN })).resolves.toEqual({ deviceKey: KEY });
    expect(apiSend).toHaveBeenCalledWith('PUT', '/me/push-tokens', { token: TOKEN });
  });

  it('DELETEs the URL-encoded token', async () => {
    const { client, apiSend } = clientAnswering(undefined);
    await expect(pushTokenCalls(client).remove(TOKEN)).resolves.toBeUndefined();
    const path = `/me/push-tokens/${encodeURIComponent(TOKEN)}`;
    expect(apiSend).toHaveBeenCalledWith('DELETE', path, undefined);
  });

  it('throws bad_response for a PUT answer without a device key', async () => {
    const { client } = clientAnswering(undefined);
    const failure = await pushTokenCalls(client)
      .add({ token: TOKEN })
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
