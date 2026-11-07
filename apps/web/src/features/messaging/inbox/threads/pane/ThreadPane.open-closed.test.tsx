import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SETTINGS } from '@/test/settings-fixture';
import { t } from '@/lib/i18n/i18n';
import { detail, message, PHONE, template, thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { InboxPage } from '@/features/messaging/inbox/threads/list/InboxPage';
import { ThreadPane } from './ThreadPane';

// Owner 2026-11-07 (option 1): opening a chat whose 24 h window is closed sends NOTHING (an admin
// opened one at night and the family got the welcome template). The starter goes on send only.

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink }));

function openThread(over: object) {
  routeFetch(apiFetch, [
    ['/threads/%2B966501234567', detail([message()], { guardian_id: 'g-1', ...over })],
    ['/messaging/templates', [template()]],
    ['/messages/gate', { open: true, reason: null, queued: 0 }],
    ['/settings', SETTINGS],
    ['/leads?', { items: [], total: 0, page: 1, pageSize: 5 }],
  ]);
  renderWithClient(<ThreadPane phone={PHONE} listSearch={{ page: 1 }} />);
}

afterEach(() => {
  cleanup();
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('opening a closed chat', () => {
  it('sends no request at all; the note says the welcome goes first on send', async () => {
    openThread({ session_open: false, try_after_window: true });
    expect(await screen.findByText(t.inbox.tryAfterWindow)).toBeTruthy();
    const box = await screen.findByRole('textbox', { name: t.inbox.composer.messageLabel });
    expect(box).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
    expect(apiFetch.mock.calls.some((c) => String(c[0]).includes('/reopen'))).toBe(false);
  });

  it('a closed chat with templates only (meta line): no request either', async () => {
    openThread({ session_open: false });
    expect(await screen.findByText(t.inbox.sessionClosed)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('the list of closed chats never asks', async () => {
    const items = [thread({ session_open: false }), thread({ phone_e164: '+201001234567', session_open: false })];
    routeFetch(apiFetch, [['/threads?', { items, total: 2, page: 1, pageSize: 30 }]]);
    renderWithClient(<InboxPage search={{ page: 1 }} onSearch={vi.fn()} />);
    expect((await screen.findAllByRole('link')).length).toBeGreaterThan(0);
    expect(apiSend).not.toHaveBeenCalled();
  });
});
