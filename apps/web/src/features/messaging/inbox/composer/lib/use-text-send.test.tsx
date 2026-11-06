import type { MessageView, ThreadDetail, ThreadView } from '@ab/shared';
import { QueryClient, QueryClientProvider, useInfiniteQuery } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { threadQuery } from '@/features/messaging/inbox/api/api';
import { detail, message, PHONE, thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { clearAllDrafts, draftGeneration, getDraft } from './draft-store';
import { ownSendGeneration } from './own-send';
import { type Sent, useTextSend } from './use-text-send';

// docs/44 BUG3 (web): the text shows at once as a queued bubble, the API's row takes its place,
// and only the open chat's newest page is read again (docs/43 AU4), never every ['threads'] query.

const apiSend = vi.hoisted(() => vi.fn());
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const PATH = '/threads/%2B966501234567';
const ID = 'c0000000-0000-4000-8000-0000000000a1';
const LIST = ['threads', 'list', 'page=1'];
const at = (minute: number) => `2026-11-06T08:${String(minute).padStart(2, '0')}:00Z`;
const row = (id: string, minute: number) => message({ id, created_at: at(minute) });
const older = (m: MessageView): ThreadDetail => ({ ...detail([m]), has_more: true });
const server = message({ id: 's1', direction: 'outbound', status: 'queued', body: 'وصلت', created_at: at(50) });
/** A send started now (the tab-memory generations of this moment). */
const sending = (): Sent => ({
  ...{ phone: PHONE, text: 'وصلت', clientRequestId: ID },
  gen: { draft: draftGeneration(), own: ownSendGeneration() },
});

function setup() {
  const defaultOptions = { queries: { retry: false }, mutations: { retry: false } };
  const client = new QueryClient({ defaultOptions });
  const pages = [40, 30, 20, 10].map((n) => older(row(`m${n}`, n)));
  pages.push(detail([row('m01', 1)]));
  client.setQueryData(threadQuery(PHONE).queryKey, { pages, pageParams: pages.map(() => null) });
  client.setQueryData(LIST, { items: [thread({ last_body: 'قديمة' })], total: 1, page: 1, pageSize: 30 });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hooks = { replyDone: vi.fn(), settled: vi.fn() };
  const hook = renderHook(
    () => {
      // The open chat: an observer that does not read on its own during the test.
      useInfiniteQuery({ ...threadQuery(PHONE), staleTime: Infinity, refetchInterval: false });
      return useTextSend(PHONE, hooks);
    },
    { wrapper },
  );
  const cached = () => client.getQueryData(threadQuery(PHONE).queryKey);
  const ids = () =>
    [...(cached()?.pages ?? [])].reverse().flatMap((p) => p.messages.map((m) => m.id));
  const listRow = () => client.getQueryData<{ items: ThreadView[] }>(LIST)?.items[0];
  return { client, hook, hooks, cached, ids, listRow };
}

const paths = () => apiFetch.mock.calls.map(([p]) => String(p));

afterEach(() => {
  apiSend.mockReset();
  apiFetch.mockReset();
  clearAllDrafts();
});

describe('useTextSend: an optimistic send', () => {
  it('shows the provisional row at once, then the API row; five pages loaded, one GET', async () => {
    let answer: (v: MessageView) => void = () => undefined;
    apiSend.mockReturnValue(new Promise<MessageView>((resolve) => (answer = resolve)));
    apiFetch.mockResolvedValue(detail([row('m40', 40), { ...server, status: 'sent' }]));
    const s = setup();
    act(() => s.hook.result.current.mutate(sending()));
    await waitFor(() => expect(s.ids().at(-1)).toBe(ID));
    expect(s.cached()?.pages[0]?.messages.at(-1)).toMatchObject({ status: 'queued', body: 'وصلت' });
    expect(s.listRow()).toMatchObject({ last_body: 'وصلت', last_status: 'queued' });
    act(() => answer(server));
    await waitFor(() => expect(s.cached()?.pages[0]?.messages.at(-1)?.status).toBe('sent'));
    expect(paths()).toEqual([PATH]);
    expect(s.cached()?.pages).toHaveLength(5);
    expect(s.ids()).toEqual(['m01', 'm10', 'm20', 'm30', 'm40', 's1']);
  });

  it('no double row when a read brought the server row in before the answer', async () => {
    let answer: (v: MessageView) => void = () => undefined;
    apiSend.mockReturnValue(new Promise<MessageView>((resolve) => (answer = resolve)));
    apiFetch.mockResolvedValue(detail([row('m40', 40), server]));
    const s = setup();
    act(() => s.hook.result.current.mutate(sending()));
    await waitFor(() => expect(s.ids().at(-1)).toBe(ID));
    const key = threadQuery(PHONE).queryKey;
    // A delta or realtime read lands the server row while the provisional one is still there.
    const withServer = (p: ThreadDetail, i: number) =>
      i === 0 ? { ...p, messages: [...p.messages, server] } : p;
    act(() => {
      s.client.setQueryData(key, (old) => old && { ...old, pages: old.pages.map(withServer) });
    });
    act(() => answer(server));
    await waitFor(() => expect(s.hooks.settled).toHaveBeenCalled());
    await waitFor(() => expect(paths()).toEqual([PATH]));
    expect(s.ids().filter((id) => id === 's1' || id === ID)).toEqual(['s1']);
  });

  it('a refused send takes the row out and puts the text back with its key', async () => {
    apiSend.mockRejectedValue(new ApiError(500, null));
    const s = setup();
    act(() => s.hook.result.current.mutate(sending()));
    await waitFor(() => expect(s.hooks.settled).toHaveBeenCalled());
    expect(s.ids()).not.toContain(ID);
    expect(getDraft(PHONE)).toMatchObject({ text: 'وصلت', failed: { text: 'وصلت', id: ID } });
    expect(paths()).toEqual([]);
  });
});
