import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../core/http';
import { guestJoinCalls } from '..';

const JOIN = { url: 'wss://x', token: 't', room: 'r', role: 'guest' };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async (_path: string) => answer);
  const apiSend = vi.fn(async (_m: string, _path: string, _body?: unknown) => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiSend };
};

describe('guestJoinCalls (R-LES-01)', () => {
  it('joins by the link token, encoded in the path, with the typed name', async () => {
    const { client, apiSend } = clientAnswering(JOIN);
    await expect(guestJoinCalls(client).join({ linkToken: 'a/b', name: 'ليلى' })).resolves.toEqual(
      JOIN,
    );
    expect(apiSend).toHaveBeenCalledWith('POST', '/public/join/a%2Fb', { name: 'ليلى' });
  });

  it('sends no name for the family link that names its student', async () => {
    const { client, apiSend } = clientAnswering(JOIN);
    await guestJoinCalls(client).join({ linkToken: 't' });
    expect(apiSend).toHaveBeenCalledWith('POST', '/public/join/t', {});
  });

  it('refuses an answer with an unknown role', async () => {
    const { client } = clientAnswering({ ...JOIN, role: 'boss' });
    await expect(guestJoinCalls(client).join({ linkToken: 't', name: 'x' })).rejects.toThrow();
  });
});
