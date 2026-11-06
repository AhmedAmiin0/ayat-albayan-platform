import type { ThreadDetail } from '@ab/shared';
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearOwnSends, recordOwnSend } from '@/features/messaging/inbox/composer/lib/own-send';
import { detail, message, PHONE } from '@/features/messaging/inbox/testing/inbox-fixture';
import { AnchorHarness } from '@/features/messaging/inbox/testing/anchor-harness';
import { useChatAnchor } from '@/features/messaging/inbox/shared/chat-anchor';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { useThreadLog } from './use-thread-log';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
const jump = vi.hoisted(() => vi.fn());
vi.mock('@/features/messaging/inbox/messages/lib/jump-to-message', () => ({ jumpToMessage: jump }));

/** The next window's answer, held until the test lets it go. */
function held() {
  let resolve: (d: ThreadDetail) => void = () => undefined;
  const promise = new Promise<ThreadDetail>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
let next = held();
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
  // `move`: the route's anchor setter (a search step), beside the log it drives.
  const hook = renderHook(() => ({ ...useThreadLog(PHONE, live), move: useChatAnchor().anchor }), {
    wrapper,
  });
  return { ...hook, onAnchor };
}

beforeEach(() => {
  apiFetch.mockImplementation(async (path: string) => {
    if (path.includes(`around=${ID(2)}`)) return detail([OLD]);
    if (path.includes(`around=${ID(4)}`)) return next.promise;
    if (path.includes(`around=${ID(5)}`)) throw new ApiError(500);
    throw new ApiError(404);
  });
});
afterEach(() => {
  next = held();
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

  it('a window read answering 404 says the hit is gone; the live rows stay', async () => {
    const { result } = setup(ID(3));
    await waitFor(() => expect(result.current.problem).toBe(t.inbox.chatSearch.unreachable));
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(result.current.anchor).toBeUndefined();
    expect(result.current.messages.map((m) => m.id)).toEqual([ID(1)]);
  });

  it('any other failed read is retried, then shows the common error (not «unreachable»)', async () => {
    const { result } = setup(ID(5));
    await waitFor(() => expect(result.current.problem).toBe(t.common.error), { timeout: 8000 });
    expect(apiFetch).toHaveBeenCalledTimes(3);
  }, 10_000);

  it('from one window to a hit outside it: the old window stays until the next one loads', async () => {
    const { result } = setup(ID(2));
    await waitFor(() => expect(result.current.anchor?.id).toBe(ID(2)));
    act(() => result.current.move(ID(4)));
    await waitFor(() => expect(result.current.anchor?.id).toBe(ID(4)));
    expect(result.current.messages.map((m) => m.id)).toEqual([ID(2)]);
    act(() => {
      next.resolve(detail([message({ id: ID(4), created_at: '2025-12-01T10:00:00Z' })]));
    });
    await waitFor(() => expect(result.current.messages.map((m) => m.id)).toEqual([ID(4)]));
    expect(result.current.anchor?.id).toBe(ID(4));
  });
});
