import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { inboxLive, useInboxRealtime } from './live';

// docs/44 K2: a dropped channel rejoins with backoff, at once when the network is back, then
// resyncs.

type Status = (s: string) => void;
const rt = vi.hoisted(() => {
  const joins: { status?: Status }[] = [];
  const supabase = {
    channel: vi.fn(() => {
      const ch: { status?: Status; on: () => typeof ch; subscribe: (cb: Status) => typeof ch } = {
        on: () => ch,
        subscribe: (cb) => ((ch.status = cb), ch),
      };
      joins.push(ch);
      return ch;
    }),
    removeChannel: vi.fn(async () => 'ok'),
    getChannels: vi.fn(() => []),
    realtime: { setAuth: vi.fn(async () => undefined), disconnect: vi.fn(async () => 'ok') },
  };
  return { joins, supabase };
});
vi.mock('@/lib/http/supabase', () => ({ supabase: rt.supabase }));

const settle = () => act(async () => undefined);
const status = (s: string) => act(async () => rt.joins.at(-1)?.status?.(s));
const later = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms).then(() => undefined));

async function mount() {
  const client = new QueryClient();
  const refetch = vi.spyOn(client, 'refetchQueries').mockResolvedValue(undefined);
  vi.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useInboxRealtime(true), { wrapper });
  await settle();
  return { hook, refetch };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  rt.joins.length = 0;
  vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it('a drop turns the dot off and rejoins after 1 s; SUBSCRIBED again turns it on and re-reads the list', async () => {
  const { hook, refetch } = await mount();
  await status('SUBSCRIBED');
  expect(inboxLive.isLive()).toBe(true);
  await status('CHANNEL_ERROR');
  expect(inboxLive.isLive()).toBe(false);
  await later(999);
  expect(rt.supabase.channel).toHaveBeenCalledTimes(1);
  await later(1);
  expect(rt.supabase.channel).toHaveBeenCalledTimes(2);
  refetch.mockClear();
  await status('SUBSCRIBED');
  expect(inboxLive.isLive()).toBe(true);
  await later(3_000); // the list's 3 s throttle
  expect(refetch.mock.calls.map(([f]) => f?.queryKey)).toContainEqual(['threads', 'list']);
  hook.unmount();
});

it('the network back (online) rejoins a dropped channel at once, not after the backoff', async () => {
  const { hook } = await mount();
  await status('TIMED_OUT');
  await act(async () => void window.dispatchEvent(new Event('online')));
  await settle();
  expect(rt.supabase.channel).toHaveBeenCalledTimes(2);
  hook.unmount();
  await act(async () => void window.dispatchEvent(new Event('online')));
  await later(60_000);
  expect(rt.supabase.channel).toHaveBeenCalledTimes(2);
});
