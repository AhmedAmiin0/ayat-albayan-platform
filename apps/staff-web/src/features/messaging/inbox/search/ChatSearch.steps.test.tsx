import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { PHONE } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { AnchorHarness } from '@/features/messaging/inbox/testing/anchor-harness';
import { ThreadPane } from '@/features/messaging/inbox/threads/pane/ThreadPane';
import { id, NEW, OLD, PATH, routeChat, stubLayout } from '@/features/messaging/inbox/testing/chat-search-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend: vi.fn() }));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink,
}));

const search = t.inbox.chatSearch;
const counter = (n: number, m: number) =>
  search.counter.replace('{n}', String(n)).replace('{m}', String(m));
const bubble = (n: number) => document.getElementById(`msg-${id(n)}`);

async function openAndType(words: string) {
  renderWithClient(
    <AnchorHarness>
      <ThreadPane phone={PHONE} listSearch={{ page: 1 }} />
    </AnchorHarness>,
  );
  fireEvent.click(await screen.findByRole('button', { name: search.open }));
  const box = screen.getByRole('searchbox', { name: search.label });
  expect(document.activeElement).toBe(box);
  fireEvent.change(box, { target: { value: words } });
  return box;
}

describe('«بحث» inside a chat (web)', () => {
  let scroll: Mock;
  beforeEach(() => {
    scroll = stubLayout();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    apiFetch.mockReset();
  });

  it('typing asks once settled, shows «1 من 2», jumps to the newest hit and marks its words', async () => {
    routeChat(apiFetch, [NEW, OLD]);
    await openAndType('اسلام');
    expect(await screen.findByText(counter(1, 2), {}, { timeout: 5000 })).toBeTruthy();
    const asked = apiFetch.mock.calls.map(([p]) => String(p)).filter((p) => p.includes('/search'));
    expect(asked).toEqual([`${PATH}/search?q=${encodeURIComponent('اسلام')}`]);
    await waitFor(() => expect(bubble(2)?.hasAttribute('data-flash')).toBe(true));
    expect(bubble(2)?.querySelector('mark')?.textContent).toBe('إسلام');
    expect(bubble(3)?.querySelector('mark')).toBeNull();
  });

  it('↑ to an older hit opens the window around it with one request, then it is scrolled to', async () => {
    routeChat(apiFetch, [NEW, OLD]);
    await openAndType('اسلام');
    await screen.findByText(counter(1, 2), {}, { timeout: 5000 });
    expect(bubble(1)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: search.older }));
    expect(await screen.findByText(counter(2, 2))).toBeTruthy();
    await waitFor(() => expect(bubble(1)?.hasAttribute('data-flash')).toBe(true));
    const asked = apiFetch.mock.calls.map(([p]) => String(p));
    expect(asked).toContain(`${PATH}?around=${id(1)}`);
    expect(asked.some((p) => p.startsWith(`${PATH}?before=`))).toBe(false);
    expect(screen.getByRole('button', { name: t.inbox.jumpLatest })).toBeTruthy();
    expect(screen.getByRole('button', { name: search.older })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: search.newer }));
    expect(await screen.findByText(counter(1, 2))).toBeTruthy();
  });

  it('Enter / Shift+Enter step, Esc closes: back to the newest message, focus on «بحث»', async () => {
    routeChat(apiFetch, [NEW, OLD]);
    const box = await openAndType('اسلام');
    await screen.findByText(counter(1, 2), {}, { timeout: 5000 });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(await screen.findByText(counter(2, 2))).toBeTruthy();
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    expect(await screen.findByText(counter(1, 2))).toBeTruthy();
    scroll.mockClear();
    fireEvent.keyDown(box, { key: 'Escape' });
    expect(screen.queryByRole('search')).toBeNull();
    expect(scroll.mock.contexts[0]).toBe(bubble(3));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: search.open }));
    expect(document.querySelector('mark')).toBeNull();
  });

  it('no hit: «لا توجد نتائج», both arrows off', async () => {
    routeChat(apiFetch, []);
    await openAndType('وداعا');
    expect(await screen.findByText(search.empty, {}, { timeout: 5000 })).toBeTruthy();
    for (const name of [search.older, search.newer]) {
      expect(screen.getByRole('button', { name })).toHaveProperty('disabled', true);
    }
  });
});
