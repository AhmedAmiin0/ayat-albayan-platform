import { INBOX_HIDDEN_LEAVE_MS } from '@ab/client-core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { inboxLive, useInboxRealtime } from './live';

// Owner 2026-10-27: close the connection when it is not needed, no leaks. Mocked client, no socket.

type Status = (s: string) => void;
const rt = vi.hoisted(() => {
  const state = { joins: [] as { status?: Status }[], removed: [] as unknown[], others: [] as unknown[] };
  const supabase = {
    channel: vi.fn(() => {
      const ch: { status?: Status; on: () => typeof ch; subscribe: (cb: Status) => typeof ch } = {
        on: () => ch,
        subscribe: (cb) => ((ch.status = cb), ch),
      };
      state.joins.push(ch);
      return ch;
    }),
    removeChannel: vi.fn(async (ch: unknown) => void state.removed.push(ch)),
    getChannels: vi.fn(() => [...state.others, ...state.joins.filter((c) => !state.removed.includes(c))]),
    realtime: { setAuth: vi.fn(async () => undefined), disconnect: vi.fn(async () => 'ok') },
  };
  return { state, supabase };
});
vi.mock('@/lib/http/supabase', () => ({ supabase: rt.supabase }));

let visibility: DocumentVisibilityState = 'visible';
const handlers = new Set<EventListenerOrEventListenerObject>();
const open = () => rt.state.joins.length - rt.state.removed.length;
const settle = () => act(async () => undefined);
const show = (v: DocumentVisibilityState) =>
  act(async () => {
    visibility = v;
    document.dispatchEvent(new Event('visibilitychange'));
  });

function mount() {
  const client = new QueryClient();
  vi.spyOn(client, 'refetchQueries').mockResolvedValue(undefined);
  vi.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined);
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { hook: renderHook(() => useInboxRealtime(true), { wrapper }), client };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  Object.assign(rt.state, { joins: [], removed: [], others: [] });
  visibility = 'visible';
  handlers.clear();
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
  vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  const add = document.addEventListener.bind(document);
  const remove = document.removeEventListener.bind(document);
  vi.spyOn(document, 'addEventListener').mockImplementation((t, h, o) => (t === 'visibilitychange' && handlers.add(h), add(t, h, o)));
  vi.spyOn(document, 'removeEventListener').mockImplementation((t, h, o) => (handlers.delete(h), remove(t, h, o)));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it('mount → unmount 20 times: no channel, visibility listener or timer left; not live; socket closed', async () => {
  for (let i = 0; i < 20; i += 1) {
    const { hook } = mount();
    await settle();
    rt.state.joins.at(-1)?.status?.('SUBSCRIBED');
    hook.unmount();
    await settle();
  }
  expect([rt.state.joins.length, rt.supabase.removeChannel.mock.calls.length, open()]).toEqual([20, 20, 0]);
  expect([rt.supabase.realtime.disconnect.mock.calls.length, handlers.size, vi.getTimerCount()]).toEqual([20, 0, 0]);
  expect(inboxLive.isLive()).toBe(false);
});

it('hidden 5 min → leaves (polls take over); visible again → one rejoin that resyncs on SUBSCRIBED', async () => {
  const { hook, client } = mount();
  await settle();
  rt.state.joins[0]?.status?.('SUBSCRIBED');
  await show('hidden');
  await act(() => vi.advanceTimersByTimeAsync(INBOX_HIDDEN_LEAVE_MS - 1));
  expect([open(), inboxLive.isLive()]).toEqual([1, true]);
  await act(() => vi.advanceTimersByTimeAsync(1));
  expect([open(), inboxLive.isLive(), vi.getTimerCount()]).toEqual([0, false, 0]);
  await act(() => vi.advanceTimersByTimeAsync(10_000));
  const reads = vi.mocked(client.refetchQueries).mock.calls.length;
  await show('visible');
  await settle();
  expect([rt.state.joins.length, open()]).toEqual([2, 1]);
  rt.state.joins[1]?.status?.('SUBSCRIBED');
  expect(vi.mocked(client.refetchQueries).mock.calls.length).toBe(reads + 1);
  hook.unmount();
});

it('hidden briefly keeps the channel; flips never hold two; another feature keeps the socket open', async () => {
  rt.state.others = [{ topic: 'realtime:wa_calls:x' }];
  const { hook } = mount();
  for (let i = 0; i < 10; i += 1) {
    await show('hidden');
    await show('visible');
    expect(open()).toBeLessThanOrEqual(1);
  }
  await settle();
  expect([rt.state.joins.length, open()]).toEqual([1, 1]);
  hook.unmount();
  await settle();
  expect([open(), rt.supabase.realtime.disconnect.mock.calls.length, vi.getTimerCount()]).toEqual([0, 0, 0]);
});

it('a tab opened hidden does not join until it is shown', async () => {
  visibility = 'hidden';
  const { hook } = mount();
  await settle();
  expect([rt.state.joins.length, vi.getTimerCount()]).toEqual([0, 0]);
  await show('visible');
  await settle();
  expect(open()).toBe(1);
  hook.unmount();
});
