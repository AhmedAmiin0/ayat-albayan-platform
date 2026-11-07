import type { ThreadView } from '@ab/shared';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useInboxRealtime } from './live';
import { live, thread } from './patch-fixtures';

// docs/44 K1 (round 4): a reminder batch (insert + claim + sent + delivered + read per message)
// must not starve GET /threads: a rows event never cancels a list read, so the throttled re-read
// lands during the burst. Real live layer and query client; the socket and the API are fakes.

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
