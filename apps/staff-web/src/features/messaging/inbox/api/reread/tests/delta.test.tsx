import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { detail, message, PHONE } from '@/features/messaging/inbox/testing/inbox-fixture';
import { rereadChat } from '@/features/messaging/inbox/api/reread/reread';
import { useLiveThread } from '@/features/messaging/inbox/api/thread-delta';

// A live event on the open chat reads the delta (~2 rows), not every loaded page; the whole
// thread is read again only when the delta leaves a gap (needsFullRead) or no row anchors it.

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/features/messaging/inbox/api/api', async (orig) => ({ ...(await orig<object>()), inboxPollMs: () => 3_600_000 }));

const PATH = '/threads/%2B966501234567';
const first = message({ id: 'm1', created_at: '2026-11-07T10:00:00Z' });
const quiet = { messages: [], has_more: false, pending: [] };
const paths = () => apiFetch.mock.calls.map(([p]) => String(p));
const deltaReads = () => paths().filter((p) => p.startsWith(`${PATH}?after=`)).length;
const fullReads = () => paths().filter((p) => p === PATH).length;

function open(rows = [first], delta: unknown = quiet) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  apiFetch.mockImplementation(async (p: string) => (p === PATH ? detail(rows) : delta));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useLiveThread(PHONE), { wrapper });
  return { client, hook };
}

beforeEach(() => vi.spyOn(document, 'hasFocus').mockReturnValue(true));
afterEach(() => {
  apiFetch.mockReset();
  vi.restoreAllMocks();
});

it('N events on the open chat: N delta reads and no full read', async () => {
  const { client, hook } = open();
  await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
  for (const n of [1, 2, 3]) {
    rereadChat(client, PHONE);
    await waitFor(() => expect(deltaReads()).toBe(n));
  }
  await waitFor(() => expect(client.isFetching()).toBe(0));
  expect(fullReads()).toBe(1);
});

it('an event whose delta merges: the new row lands in the chat', async () => {
  const fresh = message({ id: 'm2', created_at: '2026-11-07T10:05:00Z' });
  const { client, hook } = open([first], { ...quiet, messages: [fresh] });
  await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
  rereadChat(client, PHONE);
  await waitFor(() =>
    expect(hook.result.current.data?.pages[0]?.messages.map((m) => m.id)).toEqual(['m1', 'm2']),
  );
});

it('an event whose delta leaves a gap: the whole thread is read once', async () => {
  const { client, hook } = open([first], { ...quiet, has_more: true });
  await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
  rereadChat(client, PHONE);
  await waitFor(() => expect(fullReads()).toBe(2));
  expect(deltaReads()).toBe(1);
});

it('an event on an empty chat (no row to anchor a delta on): the whole thread is read', async () => {
  const { client, hook } = open([]);
  await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
  rereadChat(client, PHONE);
  await waitFor(() => expect(fullReads()).toBe(2));
  expect(deltaReads()).toBe(0);
});

it('an event while the window has no focus: no read at all (reading marks it read)', async () => {
  const { client, hook } = open();
  await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
  vi.spyOn(document, 'hasFocus').mockReturnValue(false);
  rereadChat(client, PHONE);
  await new Promise((r) => setTimeout(r, 30));
  expect([fullReads(), deltaReads()]).toEqual([1, 0]);
});
