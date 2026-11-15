import type { ThreadDetail, ThreadView } from '@ab/shared';
import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useInboxRealtime, useLiveChat } from './live';
import { live, msg, PHONE, thread } from './patch-fixtures';
import { threadQuery } from './thread-query';

// docs/44 K1 (rounds 4-5): a reminder batch (insert + claim + sent + delivered + read per message)
// must not starve GET /threads nor the open chat's GET /threads/:phone: a rows event never cancels
// a read, so the throttled re-read lands during the burst. Real live layer and query client; the
// socket and the API are fakes.

const rt = vi.hoisted(() => {
  const hooks: { event?: (m: { payload: unknown }) => void } = {};
  const channel: { on: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> } = {
    on: vi.fn((_t: string, _f: unknown, cb: (m: { payload: unknown }) => void) => {
      hooks.event = cb;
      return channel;
    }),
    subscribe: vi.fn(() => channel),
  };
  const supabase = {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(async () => 'ok'),
    getChannels: vi.fn(() => []),
    realtime: { setAuth: vi.fn(async () => undefined), disconnect: vi.fn(async () => 'ok') },
  };
  return { hooks, supabase };
});
vi.mock('@/lib/http/supabase', () => ({ supabase: rt.supabase }));

const ids = Array.from({ length: 20 }, (_, i) => `m${i}`);
/** GET /threads: a slow server (1 s per read), every row's last message still ✓. */
const slowList = vi.fn(
  () =>
    new Promise<{ items: ThreadView[] }>((resolve) => {
      setTimeout(() => resolve({ items: ids.map((id) => thread(id, 'sent')) }), 1_000);
    }),
);

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(document, 'hasFocus').mockReturnValue(true);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it('a burst of 20 rows events over 6 s with a slow list read: list reads still land', async () => {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const view = renderHook(
    () => {
      useInboxRealtime(true);
      return useQuery({ queryKey: ['threads', 'list', ''], queryFn: slowList });
    },
    { wrapper },
  );
  await act(() => vi.advanceTimersByTimeAsync(1_000));
  const first = client.getQueryState(['threads', 'list', ''])?.dataUpdatedAt ?? 0;
  const landed: number[] = [];
  for (const id of ids) {
    const payload = { phone: '+966500000009', rows: [live(id, 'delivered')] };
    await act(async () => rt.hooks.event?.({ payload }));
    await act(() => vi.advanceTimersByTimeAsync(300));
    landed.push(client.getQueryState(['threads', 'list', ''])?.dataUpdatedAt ?? 0);
  }
  expect(landed.filter((at) => at > first).length).toBeGreaterThan(0);
  view.unmount();
});

/** GET /threads/:phone: 400 ms per read, every message still ✓ (each event moves one tick). */
const slowChat = vi.fn(
  () =>
    new Promise<ThreadDetail>((resolve) => {
      const messages = ids.map((id) => msg(id, 'sent'));
      setTimeout(() => resolve({ messages, has_more: false } as ThreadDetail), 400);
    }),
);

it('15 tick events over 8 s on the open chat with a 400 ms read: chat reads land', async () => {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const chat = { ...threadQuery(PHONE), queryFn: slowChat, refetchInterval: false } as const;
  const view = renderHook(
    () => {
      useInboxRealtime(true);
      useLiveChat(PHONE);
      return useInfiniteQuery(chat);
    },
    { wrapper },
  );
  await act(() => vi.advanceTimersByTimeAsync(400));
  const first = client.getQueryState(chat.queryKey)?.dataUpdatedAt ?? 0;
  const landed: number[] = [];
  for (const id of ids.slice(0, 15)) {
    await act(async () =>
      rt.hooks.event?.({ payload: { phone: PHONE, rows: [live(id, 'read')] } }),
    );
    await act(() => vi.advanceTimersByTimeAsync(533));
    landed.push(client.getQueryState(chat.queryKey)?.dataUpdatedAt ?? 0);
  }
  expect(new Set(landed.filter((at) => at > first)).size).toBeGreaterThan(3);
  view.unmount();
});
