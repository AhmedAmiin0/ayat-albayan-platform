import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { template, thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { ReopenBar } from './ReopenBar';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'x' } } }) } },
}));
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

// Owner 2026-11-14 («like Kapso»): the closed window's bar. Nothing is sent from these tests.

const base = { context: {}, noneAllowed: null, trying: true, teacher: false };
const SENT = { id: 'm-r', template_key: 'welcome_greeting', status: 'delivered' as const };
const action = () => screen.queryByRole('button', { name: t.inbox.reopenBar.action });

afterEach(() => apiFetch.mockReset());

describe('ReopenBar', () => {
  it('open window: nothing', () => {
    renderWithClient(<ReopenBar {...base} thread={thread({ session_open: true })} />);
    expect(screen.queryByText(t.inbox.reopenBar.closed)).toBeNull();
    expect(action()).toBeNull();
  });

  it('closed, none live: the line and the reopen button, which opens the picker', async () => {
    routeFetch(apiFetch, [['/messaging/templates', []]]);
    renderWithClient(<ReopenBar {...base} thread={thread({ session_open: false })} />);
    expect(screen.getAllByText(t.inbox.reopenBar.closed)).toHaveLength(1);
    fireEvent.click(action() as HTMLElement);
    expect(await screen.findByRole('dialog', { name: t.inbox.reopenBar.action })).toBeTruthy();
  });

  it('templates allowed, none from the chat line: the line, no button (no empty picker)', async () => {
    routeFetch(apiFetch, [['/messaging/templates', [template({ key: 'renewal_due' })]]]);
    renderWithClient(<ReopenBar {...base} thread={thread({ session_open: false })} />);
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalled());
    await vi.waitFor(() => expect(action()).toBeNull());
    expect(screen.getByText(t.inbox.reopenBar.closed)).toBeTruthy();
  });

  it('a reopen template live: «sent», its tick, the held note; no button', () => {
    const closed = thread({ session_open: false, reopen_sent: SENT });
    renderWithClient(<ReopenBar {...base} thread={closed} />);
    expect(screen.getByText(t.inbox.reopenBar.sent)).toBeTruthy();
    const tick = t.inbox.reopenBar.status.replace('{status}', t.enums.messageStatus.delivered);
    expect(screen.getByText(tick)).toBeTruthy();
    expect(screen.getByText(t.inbox.reopenBar.held)).toBeTruthy();
    expect(action()).toBeNull();
  });

  it('live, but they cannot type (meta line, teacher): no held note', () => {
    const closed = thread({ session_open: false, reopen_sent: SENT });
    renderWithClient(<ReopenBar {...base} trying={false} thread={closed} />);
    expect(screen.queryByText(t.inbox.reopenBar.held)).toBeNull();
  });

  it('no template allowed: the help line, no button', () => {
    const props = { ...base, noneAllowed: 'no_template' as const };
    renderWithClient(<ReopenBar {...props} thread={thread({ session_open: false })} />);
    expect(screen.getByText(t.inbox.composer.noAllowedHelp)).toBeTruthy();
    expect(action()).toBeNull();
  });
});
