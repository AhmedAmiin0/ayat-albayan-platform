import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { detail, message, PHONE } from '../testing/inbox-fixture';
import { useLiveThread } from './thread-delta';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
// A fast delta tick for the test; the real one is 10 s (THREAD_DELTA_MS).
vi.mock('./api', async (orig) => ({ ...(await orig<object>()), INBOX_REFRESH_MS: 40 }));

const PATH = '/threads/%2B966501234567';
const first = message({ id: 'm1', created_at: '2026-10-27T10:00:00Z' });
const sent = message({ id: 'c0000000-0000-4000-8000-0000000000a1', direction: 'outbound', status: 'queued', created_at: new Date().toISOString() });

function setup(delta: unknown) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  apiFetch.mockImplementation(async (path: string) => (path === PATH ? detail([first, sent], { session_open: true }) : delta));
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const hook = renderHook(() => useLiveThread(PHONE), { wrapper });
  return { client, hook };
}

const deltaCalls = () => apiFetch.mock.calls.map(([p]) => String(p)).filter((p) => p.startsWith(`${PATH}?after=`));

afterEach(() => {
  apiFetch.mockReset();
  vi.restoreAllMocks();
});

describe('useLiveThread: the open chat polls a delta between full reads', () => {
  it('asks for rows after the newest held with the moving sends, and merges new rows and ticks into the page', async () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    const fresh = message({ id: 'm2', body: 'جديد', created_at: new Date(Date.now() + 1000).toISOString() });
    const { hook } = setup({ messages: [fresh], has_more: false, pending: [{ ...sent, status: 'sent' }] });
    await waitFor(() => expect(deltaCalls().length).toBeGreaterThan(0));
    const q = new URLSearchParams(deltaCalls()[0]?.split('?')[1]);
    expect(q.get('after')).toBe(new Date(sent.created_at).toISOString());
    expect(q.get('pending')).toBe(sent.id);
    await waitFor(() => expect(hook.result.current.data?.pages[0]?.messages.map((m) => [m.id, m.status])).toEqual([
      ['m1', 'delivered'],
      [sent.id, 'sent'],
      ['m2', 'delivered'],
    ]));
    // The full read ran once (on open); everything after was a delta.
    expect(apiFetch.mock.calls.filter(([p]) => p === PATH)).toHaveLength(1);
  });

  it('a delta with a gap re-reads the whole thread instead of merging', async () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    setup({ messages: [], has_more: true, pending: [] });
    await waitFor(() => expect(apiFetch.mock.calls.filter(([p]) => p === PATH).length).toBeGreaterThan(1));
  });

  it('a window without focus sends no delta (a background window never stamps rows read)', async () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    const { hook } = setup({ messages: [], has_more: false, pending: [] });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    await new Promise((r) => setTimeout(r, 150));
    expect(deltaCalls()).toEqual([]);
  });
});
