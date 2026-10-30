import type { ChatListRef } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routeFetch } from '../../testing/test-utils';
import { ThreadListsDialog } from './ThreadListsDialog';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const PHONE = '+966501234567';
const PAY = { id: '0c000000-0000-4000-8000-000000000001', name: 'بانتظار الدفع' };
const TRIAL = { id: '0c000000-0000-4000-8000-000000000002', name: 'تجريبي' };
const box = (n: string) => screen.findByRole<HTMLInputElement>('checkbox', { name: n });
const member = (id: string) => `/chat-lists/${id}/threads/%2B966501234567`;

function show(lists: readonly ChatListRef[]) {
  routeFetch(apiFetch, [['/chat-lists', [PAY, TRIAL].map((l) => ({ ...l, count: 0 }))]]);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ui = (l: readonly ChatListRef[]) => (
    <QueryClientProvider client={client}>
      <ThreadListsDialog phone={PHONE} lists={l} onClose={vi.fn()} />
    </QueryClientProvider>
  );
  const view = render(ui(lists));
  return { rerender: (l: readonly ChatListRef[]) => view.rerender(ui(l)) };
}

/** apiSend answers only when the test resolves each call, in the order the test picks. */
function heldSends() {
  const held: { method: string; path: string; done: () => void }[] = [];
  apiSend.mockImplementation((method: string, path: string) => new Promise<void>((r) => held.push({ method, path, done: r })));
  return held;
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('ThreadListsDialog follows the cache and serialises each box', () => {
  it('opened on a stale cache: the boxes follow the refetched membership', async () => {
    const { rerender } = show([PAY]);
    expect((await box(PAY.name)).checked).toBe(true);
    rerender([TRIAL]);
    await waitFor(async () => expect((await box(PAY.name)).checked).toBe(false));
    expect((await box(TRIAL.name)).checked).toBe(true);
  });

  it('a box with a save in flight keeps the user\'s choice over a stale refetch', async () => {
    const held = heldSends();
    const { rerender } = show([]);
    fireEvent.click(await box(TRIAL.name));
    rerender([]);
    expect((await box(TRIAL.name)).checked).toBe(true);
    await act(async () => held[0]?.done());
    rerender([TRIAL]);
    expect((await box(TRIAL.name)).checked).toBe(true);
  });

  it('fast on → off of one box: DELETE is sent only after PUT answers', async () => {
    const held = heldSends();
    const { rerender } = show([]);
    fireEvent.click(await box(TRIAL.name));
    fireEvent.click(await box(TRIAL.name));
    expect((await box(TRIAL.name)).checked).toBe(false);
    fireEvent.click(await box(PAY.name));
    await waitFor(() => expect(held).toHaveLength(2));
    expect(held.map((h) => [h.method, h.path])).toEqual([
      ['PUT', member(TRIAL.id)],
      ['PUT', member(PAY.id)],
    ]);
    await act(async () => held[0]?.done());
    await waitFor(() => expect(held).toHaveLength(3));
    expect([held[2]?.method, held[2]?.path]).toEqual(['DELETE', member(TRIAL.id)]);
    await act(async () => held.slice(1).forEach((h) => h.done()));
    rerender([PAY]);
    expect((await box(TRIAL.name)).checked).toBe(false);
  });
});
