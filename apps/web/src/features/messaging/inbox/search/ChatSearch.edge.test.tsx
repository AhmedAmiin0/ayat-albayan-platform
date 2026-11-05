import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { message, PHONE } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { AnchorHarness } from '@/features/messaging/inbox/testing/anchor-harness';
import { ThreadPane } from '@/features/messaging/inbox/threads/pane/ThreadPane';
import {
  id,
  NEW,
  PATH,
  routeChat,
  stubLayout,
} from '@/features/messaging/inbox/testing/chat-search-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend: vi.fn() }));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink,
}));

const search = t.inbox.chatSearch;

async function openAndType(words: string) {
  renderWithClient(
    <AnchorHarness>
      <ThreadPane phone={PHONE} listSearch={{ page: 1 }} />
    </AnchorHarness>,
  );
  fireEvent.click(await screen.findByRole('button', { name: search.open }));
  const box = screen.getByRole('searchbox', { name: search.label });
  fireEvent.change(box, { target: { value: words } });
  return box;
}

beforeEach(() => {
  stubLayout();
});
afterEach(() => {
  vi.unstubAllGlobals();
  apiFetch.mockReset();
});

it('a jump lights the bubble but the keyboard stays in the field', async () => {
  routeChat(apiFetch, [NEW]);
  const box = await openAndType('اسلام');
  await waitFor(() => expect(document.getElementById(`msg-${id(2)}`)?.hasAttribute('data-flash')).toBe(true), {
    timeout: 5000,
  });
  expect(document.activeElement).toBe(box);
});

it('a hit the chat no longer holds (the window read fails): the log says it cannot be reached', async () => {
  const gone = message({ id: id(9), body: 'اسلام', created_at: '2026-08-01T10:00:00Z' });
  routeChat(apiFetch, [gone]);
  const routed = apiFetch.getMockImplementation();
  // The API answers 404 message_not_found for a hit that is gone.
  apiFetch.mockImplementation((path: string) =>
    path.includes(`around=${id(9)}`) ? Promise.reject(new Error('404')) : routed?.(path),
  );
  await openAndType('اسلام');
  expect(await screen.findByText(search.unreachable, {}, { timeout: 5000 })).toBeTruthy();
  expect(apiFetch.mock.calls.some(([p]) => String(p) === `${PATH}?around=${id(9)}`)).toBe(true);
  expect(apiFetch.mock.calls.some(([p]) => String(p).startsWith(`${PATH}?before=`))).toBe(false);
});
