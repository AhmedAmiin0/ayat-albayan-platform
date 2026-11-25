import { chatLiveKey } from '@ab/client-core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inboxLive, useInboxRealtime } from '@/features/messaging/inbox/api/live/live';
import { threadKeys } from '@/features/messaging/inbox/api/keys';

// The web inbox over realtime (docs/12 §15): the admin / sales shells' nudge, throttled, polls kept.

const rt = vi.hoisted(() => {
  const hooks: { status?: (s: string) => void; event?: (m: { payload: unknown }) => void } = {};
  const channel: { on: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> } = {
    on: vi.fn(
      (_t: string, _f: unknown, cb: (m: { payload: unknown }) => void) => (
        (hooks.event = cb),
        channel
      ),
    ),
    subscribe: vi.fn((cb: (s: string) => void) => ((hooks.status = cb), channel)),
  };
  const supabase = {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(async () => 'ok'),
    getChannels: vi.fn(() => []),
    realtime: { setAuth: vi.fn(async () => undefined), disconnect: vi.fn(async () => 'ok') },
  };
  return { hooks, channel, supabase };
});
vi.mock('@ab/web-kit/lib/http/supabase', () => ({ supabase: rt.supabase }));

const OPEN = '+966500000001';
const OTHER = '+966500000002';

async function mount(enabled = true) {
  const client = new QueryClient();
  const refetch = vi.spyOn(client, 'refetchQueries').mockResolvedValue(undefined);
  const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  // The open chat's delta query (thread-delta.ts): what a chat event runs.
  const deltas = vi.fn(async () => 0);
  client
    .getQueryCache()
    .build(client, { queryKey: threadKeys.delta(OPEN), queryFn: deltas, initialData: 0 });
  const hook = renderHook(() => useInboxRealtime(enabled), { wrapper });
  await act(async () => undefined);
  const keys = () => refetch.mock.calls.map(([f]) => f?.queryKey?.slice(1).join(' '));
  const calls = () => refetch.mock.calls;
  const badges = () => invalidate.mock.calls.length;
  return { hook, keys, calls, badges, deltas: () => deltas.mock.calls.length };
}
const send = (phone: string) => act(async () => rt.hooks.event?.({ payload: { phone } }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.spyOn(document, 'hasFocus').mockReturnValue(true);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useInboxRealtime (web)', () => {
  it('joins the private topic once and leaves it on unmount; disabled never joins', async () => {
    const { hook } = await mount();
    expect(rt.supabase.channel).toHaveBeenCalledTimes(1);
    expect(rt.supabase.channel).toHaveBeenCalledWith('inbox:staff', { config: { private: true } });
    hook.unmount();
    expect(rt.supabase.removeChannel).toHaveBeenCalledWith(rt.channel);
    await mount(false);
    expect(rt.supabase.channel).toHaveBeenCalledTimes(1);
  });

  it('the open chat reads its delta on its own phone only; list and badge on every phone', async () => {
    const release = inboxLive.watch(chatLiveKey(OPEN));
    const m = await mount();
    await send(OPEN);
    expect([m.keys(), m.deltas()]).toEqual([['list'], 1]);
    expect(m.badges()).toBe(1);
    await act(() => vi.advanceTimersByTimeAsync(5_000));
    await send(OTHER);
    expect([m.keys(), m.deltas()]).toEqual([['list', 'list'], 1]);
    release();
    m.hook.unmount();
  });

  it('an event re-reads the list cancelling an older read in flight, never joining it (AU1)', async () => {
    const m = await mount();
    await send(OTHER);
    const list = { queryKey: threadKeys.lists, type: 'active' };
    expect(m.calls()).toEqual([[list, { cancelRefetch: true }]]);
    m.hook.unmount();
  });

  it('a chat in a window without focus is not re-read (opening marks it read for everyone)', async () => {
    const release = inboxLive.watch(chatLiveKey(OPEN));
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    const m = await mount();
    await send(OPEN);
    expect([m.keys(), m.deltas()]).toEqual([['list'], 0]);
    release();
    m.hook.unmount();
  });

  it('a hidden tab does not re-read the list (shown again, TanStack re-reads it); the badge still updates', async () => {
    const m = await mount();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden'); // hidden after the join
    await send(OTHER);
    expect([m.keys(), m.badges()]).toEqual([[], 1]);
    m.hook.unmount();
  });

  it('a burst of 20 events → at most 2 fetches per target; SUBSCRIBED → live', async () => {
    const release = inboxLive.watch(chatLiveKey(OPEN));
    const m = await mount();
    for (let i = 0; i < 20; i += 1) await send(OPEN);
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(m.keys().filter((k) => k === 'list')).toHaveLength(2);
    expect(m.deltas()).toBe(2);
    expect(m.keys().filter((k) => k?.startsWith('detail'))).toHaveLength(0);
    expect(m.badges()).toBe(2);
    await act(async () => rt.hooks.status?.('SUBSCRIBED'));
    expect(inboxLive.isLive()).toBe(true);
    await act(async () => rt.hooks.status?.('TIMED_OUT'));
    expect(inboxLive.isLive()).toBe(false);
    release();
    m.hook.unmount();
  });
});
