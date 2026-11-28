import { describe, expect, it, vi } from 'vitest';
import { unreadCountQuery } from './unread-count';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

describe('unreadCountQuery: the read', () => {
  it('asks the chats list for one unread row and answers its total', async () => {
    apiFetch.mockResolvedValue({ items: [], total: 7, page: 1, pageSize: 1 });
    const abort = new AbortController();
    await expect(unreadCountQuery(true).queryFn({ signal: abort.signal })).resolves.toBe(7);
    expect(apiFetch).toHaveBeenCalledWith('/threads?unread=true&page=1&pageSize=1', {
      signal: abort.signal,
    });
  });

  it('a malformed answer fails the query', async () => {
    apiFetch.mockResolvedValue({ total: '3' });
    const abort = new AbortController();
    await expect(unreadCountQuery(true).queryFn({ signal: abort.signal })).rejects.toThrow();
  });
});
