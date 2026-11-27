import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { threadReadCalls } from '../thread-reads-api';

const ID = 'c0000000-0000-4000-8000-000000000001';
const CURSOR = `2026-11-06T10:00:00.000001+00:00~${ID}`;
const ANSWER = { messages: [], threads: [], gone: [ID], cursor: null, has_more: false, scope: 's' };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch };
};

describe('thread read calls: sync', () => {
  it('asks a first sync with the limit only, a later one from the encoded cursor', async () => {
    const { client, apiFetch } = clientAnswering(ANSWER);
    const calls = threadReadCalls(client);
    await expect(calls.sync({ limit: 200 })).resolves.toEqual(ANSWER);
    await calls.sync({ since: CURSOR, limit: 200 });
    expect(apiFetch.mock.calls).toEqual([
      ['/threads/sync?limit=200'],
      [`/threads/sync?since=${encodeURIComponent(CURSOR)}&limit=200`],
    ]);
  });

  it('refuses an answer with no cursor or scope', async () => {
    const { cursor: _cursor, scope: _scope, ...bare } = ANSWER;
    const calls = threadReadCalls(clientAnswering(bare).client);
    await expect(calls.sync({ limit: 200 })).rejects.toBeInstanceOf(ApiError);
  });
});
