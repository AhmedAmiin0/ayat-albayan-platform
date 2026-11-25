import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../core/http';
import { PORTAL_REFRESH_MS, portalQueries } from './portal-api';

const apiFetch = vi.fn(async (): Promise<unknown> => ({ unread: 3 }));
const client = { apiFetch, apiSend: vi.fn() } as unknown as ApiClient;

describe("portalUnreadQuery («المحادثة»'s badge)", () => {
  it('reads GET /portal/students/:id/channel/unread under the portal key, every 30 s', async () => {
    const q = portalQueries(client).portalUnreadQuery('s1');
    expect(q.queryKey).toEqual(['portal', 'students', 's1', 'channel', 'unread']);
    expect(q.refetchInterval).toBe(PORTAL_REFRESH_MS);
    await expect(q.queryFn()).resolves.toEqual({ unread: 3 });
    expect(apiFetch).toHaveBeenCalledWith('/portal/students/s1/channel/unread');
  });

  it('refuses an answer that is not a count (rule 12)', async () => {
    apiFetch.mockResolvedValueOnce({ unread: -1 });
    await expect(portalQueries(client).portalUnreadQuery('s1').queryFn()).rejects.toThrow();
  });
});
