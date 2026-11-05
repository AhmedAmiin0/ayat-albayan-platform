import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { InboxModeContext, type InboxMode } from '@/features/messaging/inbox/shared/mode';
import { template, thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { ComposerPhone } from './ComposerPhone';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/lib/http/supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'x' } } }) } },
}));

// Owner 2026-10-31: after the 24 h window, a Kapso chat line (try_after_window) still lets staff
// type; the note says the chat is reopened on send («dont use templates»: no highlighted toggle).

const props = { context: {}, gateNote: null, mode: 'text' as const, onMode: vi.fn(), teacher: false };
const box = () => screen.queryByRole('textbox', { name: t.inbox.composer.messageLabel });
const toggle = () => screen.queryByRole('button', { name: t.inbox.composer.modeTemplate });

function show(mode: InboxMode, tries: boolean, choice?: 'template' | 'wait') {
  const me = { id: 'u1', email: null, role: mode, permissions: ['messages.read', 'templates.manage'] };
  routeFetch(apiFetch, [
    ['/auth/me', me],
    ['/messaging/templates', [template({ key: 'free_trial_invite' })]],
  ]);
  const flag = tries ? { try_after_window: true, ...(choice ? { reopen_choice: choice } : {}) } : {};
  const closed = thread({ session_open: false, ...flag });
  renderWithClient(
    <InboxModeContext.Provider value={mode}>
      <ComposerPhone thread={closed} {...props} />
    </InboxModeContext.Provider>,
  );
}

afterEach(() => apiFetch.mockReset());

describe('ComposerPhone after the 24 h window', () => {
  it.each(['admin', 'sales'] as const)('%s on a Kapso chat line: the reopen note, the box', async (mode) => {
    show(mode, true);
    expect(screen.getByText(t.inbox.tryAfterWindow)).toBeTruthy();
    expect(screen.queryByText(t.inbox.sessionClosed)).toBeNull();
    expect(box()).toBeTruthy();
    await waitFor(() => expect(toggle()).toBeTruthy());
    expect(toggle()?.getAttribute('aria-pressed')).toBe('false');
    expect(toggle()?.className).not.toContain('bg-lapis-wash');
  });

  it('«بدون قالب» (owner 2026-11-06): the reopen-and-wait note, the box', () => {
    show('admin', true, 'wait');
    expect(screen.getByText(t.inbox.tryAfterWindowWait)).toBeTruthy();
    expect(screen.queryByText(t.inbox.tryAfterWindow)).toBeNull();
    expect(box()).toBeTruthy();
  });

  it('a template chosen: the welcome template note', () => {
    show('sales', true, 'template');
    expect(screen.getByText(t.inbox.tryAfterWindow)).toBeTruthy();
  });

  it('a meta chat line (no flag): templates only, as before', () => {
    show('admin', false);
    expect(screen.getByText(t.inbox.sessionClosed)).toBeTruthy();
    expect(box()).toBeNull();
  });

  it('teacher mode keeps templates only, even on Kapso', () => {
    show('teacher', true);
    expect(screen.queryByText(t.inbox.tryAfterWindow)).toBeNull();
    expect(box()).toBeNull();
  });
});
