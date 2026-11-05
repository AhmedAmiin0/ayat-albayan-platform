import type { ThreadDetail } from '@ab/shared';
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearOwnSends, recordOwnSend } from '@/features/messaging/inbox/composer/lib/own-send';
import { detail, message, PHONE } from '@/features/messaging/inbox/testing/inbox-fixture';
import { AnchorHarness } from '@/features/messaging/inbox/testing/anchor-harness';
import { useThreadLog } from './use-thread-log';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
const jump = vi.hoisted(() => vi.fn());
vi.mock('@/features/messaging/inbox/messages/lib/jump-to-message', () => ({ jumpToMessage: jump }));

const ID = (n: number) => `c0000000-0000-4000-8000-00000000000${n}`;
const SHOWN = message({ id: ID(1), created_at: '2026-10-02T10:00:00Z' });
const OLD = message({ id: ID(2), created_at: '2026-01-02T10:00:00Z' });
const page = (rows = [SHOWN]): InfiniteData<ThreadDetail> => ({
  pages: [detail(rows)],
  pageParams: [null],
});
const live = {
  data: page(),
  hasNextPage: true,
  isFetchingNextPage: false,
  fetchNextPage: vi.fn(() => Promise.resolve()),
};

function setup(initial?: string) {
  const onAnchor = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <AnchorHarness initial={initial} onAnchor={onAnchor}>
        {children}
      </AnchorHarness>
    </QueryClientProvider>
  );
  const hook = renderHook(() => useThreadLog(PHONE, live), { wrapper });
  return { ...hook, onAnchor };
}

beforeEach(() => {
  apiFetch.mockImplementation(async (path: string) => {
    if (path.includes(`around=${ID(2)}`)) return detail([OLD]);
    throw new Error(`unrouted ${path}`);
  });
});
afterEach(() => {
  apiFetch.mockReset();
  jump.mockReset();
  clearOwnSends();
});

describe('useThreadLog', () => {
  it('a hit already loaded scrolls the live chat (no window read)', async () => {
    const { result } = setup(ID(1));
    await waitFor(() => expect(jump).toHaveBeenCalledWith(ID(1), false));
    expect(result.current.anchor).toBeUndefined();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('a hit not loaded opens the window around it with one request, once per msg', async () => {
    const { result, rerender } = setup(ID(2));
    await waitFor(() => expect(result.current.anchor?.id).toBe(ID(2)));
    expect(result.current.messages.map((m) => m.id)).toEqual([ID(2)]);
    rerender();
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith(`/threads/%2B966501234567?around=${ID(2)}`);
  });

  it('«الانتقال إلى أحدث رسالة» goes back to the live chat', async () => {
    const { result, onAnchor } = setup(ID(2));
    await waitFor(() => expect(result.current.anchor).toBeDefined());
    act(() => result.current.anchor?.onNewest());
    expect(onAnchor).toHaveBeenCalledWith(undefined);
    await waitFor(() => expect(result.current.anchor).toBeUndefined());
    expect(result.current.messages.map((m) => m.id)).toEqual([ID(1)]);
  });

  it('her own send in this chat leaves the window', async () => {
    const { result, onAnchor } = setup(ID(2));
    await waitFor(() => expect(result.current.anchor).toBeDefined());
    act(() => recordOwnSend(PHONE, 'sent-1'));
    await waitFor(() => expect(onAnchor).toHaveBeenCalledWith(undefined));
  });

  it('a window read that fails (404) is lost; the live rows stay', async () => {
    const { result } = setup(ID(3));
    await waitFor(() => expect(result.current.lost).toBe(true));
    expect(result.current.anchor).toBeUndefined();
    expect(result.current.messages.map((m) => m.id)).toEqual([ID(1)]);
  });
});
