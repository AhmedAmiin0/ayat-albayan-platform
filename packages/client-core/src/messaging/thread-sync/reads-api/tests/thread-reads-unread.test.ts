import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { threadReadCalls } from '../thread-reads-api';

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async (_path: string, _init?: RequestInit) => answer);
  const client: ApiClient = { apiFetch, apiSend: vi.fn() };
  return { client, apiFetch };
};

describe('thread read calls: unread', () => {
  it('asks the chats list for one unread row with the caller signal', async () => {
    const { client, apiFetch } = clientAnswering({ items: [], total: 4, page: 1, pageSize: 1 });
    const abort = new AbortController();
    const page = await threadReadCalls(client).unread(abort.signal);
    expect(page.total).toBe(4);
    expect(apiFetch.mock.calls).toEqual([
      ['/threads?unread=true&page=1&pageSize=1', { signal: abort.signal }],
    ]);
  });

  it('refuses an answer whose total is not a whole number', async () => {
    for (const total of [1.5, '3', undefined]) {
      const { client } = clientAnswering({ items: [], total, page: 1, pageSize: 1 });
      await expect(threadReadCalls(client).unread()).rejects.toBeInstanceOf(ApiError);
    }
  });
});
