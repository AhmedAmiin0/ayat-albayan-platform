import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { threadQuery } from './api';
import { detail, message, PHONE } from './inbox-fixture';
import { InboxModeContext } from './mode';
import { renderWithClient, routeFetch } from './test-utils';
import { ThreadPane } from './ThreadPane';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./test-utils')).MockLink }));

const ROUTES = [
  ['/threads/%2B966501234567', detail([message({ body: 'السلام عليكم' })], { session_open: true })],
  ['/messaging/templates', []],
  ['/messages/gate', { open: true, reason: null, queued: 0 }],
  ['/settings', {}],
] as const;

describe('a failed background poll keeps the chat (W5)', () => {
  afterEach(() => apiFetch.mockReset());

  it('the log and the reply box stay, with one status line above the log; nothing reads «not sent»', async () => {
    routeFetch(apiFetch, ROUTES);
    const client = renderWithClient(
      <InboxModeContext.Provider value="sales">
        <ThreadPane phone={PHONE} listSearch={{ page: 1 }} />
      </InboxModeContext.Provider>,
    );
    const log = await screen.findByRole('log', { name: t.messages.log });
    expect(screen.queryByRole('status')).toBeNull();
    // The refetch fails (after its retries): the query is in error but still holds the pages.
    routeFetch(apiFetch, ROUTES.slice(1));
    await client.refetchQueries({ queryKey: threadQuery(PHONE).queryKey });

    const status = await screen.findByRole('status');
    expect(status.textContent).toBe(t.common.error);
    expect(status.compareDocumentPosition(log) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(screen.getByRole('log', { name: t.messages.log })).getByText('السلام عليكم')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: t.inbox.composer.messageLabel })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(document.body.textContent).not.toContain(t.inbox.error.send_failed);
    expect(document.body.textContent).not.toContain(t.inbox.sendFailed);
  });

  it('a first load that fails still shows the error alert instead of the chat', async () => {
    routeFetch(apiFetch, ROUTES.slice(1));
    renderWithClient(<ThreadPane phone={PHONE} listSearch={{ page: 1 }} />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByRole('log')).toBeNull();
  });

  it('a first load refused with a bare 403 reads as not allowed to view, not «not allowed to send»', async () => {
    apiFetch.mockRejectedValue(new ApiError(403, null));
    renderWithClient(<ThreadPane phone={PHONE} listSearch={{ page: 1 }} />);
    expect((await screen.findByRole('alert')).textContent).toContain(t.inbox.readForbidden);
    expect(document.body.textContent).not.toContain(t.inbox.error.forbidden);
  });
});
