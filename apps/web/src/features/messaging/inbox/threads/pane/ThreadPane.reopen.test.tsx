import { cleanup, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SETTINGS } from '@/test/settings-fixture';
import { t } from '@/lib/i18n/i18n';
import { forgetReopens } from '../../composer/lib/use-thread-reopen';
import { detail, message, PHONE, template, thread } from '../../testing/inbox-fixture';
import { renderWithClient, routeFetch } from '../../testing/test-utils';
import { InboxPage } from '../list/InboxPage';
import { ThreadPane } from './ThreadPane';

// «إعادة فتح المحادثة» (owner 2026-10-26): an explicit open of a closed chat asks the server once per
// thread per app session; the list never does.

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../../testing/test-utils')).MockLink }));

const REOPEN = '/threads/%2B966501234567/reopen';
const reopens = () => apiSend.mock.calls.filter((c) => c[1] === REOPEN).length;

function openThread(open: boolean) {
  routeFetch(apiFetch, [
    ['/threads/%2B966501234567', detail([message()], { session_open: open, guardian_id: 'g-1' })],
    ['/messaging/templates', [template()]],
    ['/messages/gate', { open: true, reason: null, queued: 0 }],
    ['/settings', SETTINGS],
    ['/leads?', { items: [], total: 0, page: 1, pageSize: 5 }],
  ]);
  renderWithClient(<ThreadPane phone={PHONE} listSearch={{ page: 1 }} />);
}

afterEach(() => {
  cleanup();
  forgetReopens();
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('reopen on open', () => {
  it('a closed chat: one request, the note above the composer; opened again this session: no new request', async () => {
    apiSend.mockResolvedValue({ kapso_reopened: true, template: 'template_queued' });
    openThread(false);
    expect((await screen.findByTestId('reopen-note')).textContent).toBe(t.inbox.reopen.requested);
    expect(apiSend).toHaveBeenCalledWith('POST', REOPEN);
    cleanup();
    openThread(false);
    expect((await screen.findByTestId('reopen-note')).textContent).toBe(t.inbox.reopen.requested);
    expect(reopens()).toBe(1);
  });

  it('already requested today: says so', async () => {
    apiSend.mockResolvedValue({ kapso_reopened: false, template: 'already_requested_today' });
    openThread(false);
    expect((await screen.findByTestId('reopen-note')).textContent).toBe(t.inbox.reopen.requestedToday);
  });

  it('a restricted role (Kapso only): no note', async () => {
    apiSend.mockResolvedValue({ kapso_reopened: true, template: 'not_allowed' });
    openThread(false);
    await waitFor(() => expect(reopens()).toBe(1));
    expect(screen.queryByTestId('reopen-note')).toBeNull();
  });

  it('an open window: nothing asked', async () => {
    openThread(true);
    expect(await screen.findByRole('textbox', { name: t.inbox.composer.messageLabel })).toBeTruthy();
    expect(reopens()).toBe(0);
  });

  it('the list of closed chats never asks', async () => {
    const items = [thread({ session_open: false }), thread({ phone_e164: '+201001234567', session_open: false })];
    routeFetch(apiFetch, [['/threads?', { items, total: 2, page: 1, pageSize: 30 }]]);
    renderWithClient(<InboxPage search={{ page: 1 }} onSearch={vi.fn()} />);
    expect((await screen.findAllByRole('link')).length).toBeGreaterThan(0);
    expect(apiSend).not.toHaveBeenCalled();
  });
});
