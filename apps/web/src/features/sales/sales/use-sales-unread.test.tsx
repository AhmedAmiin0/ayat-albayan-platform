import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INBOX_REFRESH_MS, inboxLive, inboxPollMs } from '@/features/messaging/inbox';
import { t } from '@/lib/i18n/i18n';
import { ApiError } from '@/lib/http/api';
import { salesUnreadQuery, unreadRetry, unreadTitle, useSalesUnread } from './use-sales-unread';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
const total = (n: number) => apiFetch.mockResolvedValue({ items: [], total: n, page: 1, pageSize: 1 });

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  document.title = t.app.name;
});
afterEach(() => apiFetch.mockReset());

describe('useSalesUnread (W8)', () => {
  it('returns the unread total and puts it in the tab title; back to the base title at 0', async () => {
    total(3);
    const { result } = renderHook(() => useSalesUnread(() => true), { wrapper });
    await waitFor(() => expect(result.current).toBe(3));
    expect(apiFetch).toHaveBeenCalledWith('/threads?unread=true&page=1&pageSize=1');
    expect(document.title).toBe(`(3) ${t.app.name}`);
    total(0);
    await act(() => client.invalidateQueries({ queryKey: ['threads'] }));
    await waitFor(() => expect(result.current).toBe(0));
    expect(document.title).toBe(t.app.name);
  });

  it('without inbox.read: no request, 0, the base title', async () => {
    total(5);
    const { result } = renderHook(() => useSalesUnread((p) => p !== 'inbox.read'), { wrapper });
    await act(async () => {});
    expect(apiFetch).not.toHaveBeenCalled();
    expect(result.current).toBe(0);
    expect(document.title).toBe(t.app.name);
  });

  it('inbox.read lost mid-session: the cached count leaves the title at once', async () => {
    total(4);
    let reads = true;
    const { result, rerender } = renderHook(() => useSalesUnread((p) => p !== 'inbox.read' || reads), { wrapper });
    await waitFor(() => expect(result.current).toBe(4));
    expect(document.title).toBe(`(4) ${t.app.name}`);
    reads = false;
    rerender();
    expect(result.current).toBe(0);
    expect(document.title).toBe(t.app.name);
  });

  it('restores the base title on unmount', async () => {
    total(2);
    const { result, unmount } = renderHook(() => useSalesUnread(() => true), { wrapper });
    await waitFor(() => expect(result.current).toBe(2));
    unmount();
    expect(document.title).toBe(t.app.name);
  });
});

describe('salesUnreadQuery', () => {
  it('lives under ["threads"] and keeps polling in a background tab', () => {
    const q = salesUnreadQuery(true);
    expect(q.queryKey).toEqual(['threads', 'nav-count', 'unread']);
    expect(q.refetchInterval).toBe(inboxPollMs);
    expect(inboxPollMs()).toBe(INBOX_REFRESH_MS);
    inboxLive.setLive(true);
    expect(inboxPollMs()).toBe(60_000); // realtime connected: its events refresh the count sooner
    inboxLive.setLive(false);
    expect(q.refetchIntervalInBackground).toBe(true);
    expect(salesUnreadQuery(false).enabled).toBe(false);
  });

  it('never retries a 401; other failures up to 3 times', () => {
    expect(salesUnreadQuery(true).retry).toBe(unreadRetry);
    expect(unreadRetry(0, new ApiError(401, null))).toBe(false);
    expect(unreadRetry(0, new ApiError(500, null))).toBe(true);
    expect(unreadRetry(3, new ApiError(500, null))).toBe(false);
  });

  it('unreadTitle', () => {
    expect(unreadTitle(12)).toBe(`(12) ${t.app.name}`);
    expect(unreadTitle(0)).toBe(t.app.name);
  });
});
