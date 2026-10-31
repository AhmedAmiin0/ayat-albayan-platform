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
// type; the note says WhatsApp may refuse it and the template toggle stays.

const props = { context: {}, gateNote: null, mode: 'text' as const, onMode: vi.fn(), teacher: false };
const box = () => screen.queryByRole('textbox', { name: t.inbox.composer.messageLabel });
const toggle = () => screen.queryByRole('button', { name: t.inbox.composer.modeTemplate });

function show(mode: InboxMode, tries: boolean) {
  const me = { id: 'u1', email: null, role: mode, permissions: ['messages.read', 'templates.manage'] };
  routeFetch(apiFetch, [
    ['/auth/me', me],
    ['/messaging/templates', [template({ key: 'free_trial_invite' })]],
  ]);
  const closed = thread({ session_open: false, ...(tries ? { try_after_window: true } : {}) });
  renderWithClient(
    <InboxModeContext.Provider value={mode}>
      <ComposerPhone thread={closed} {...props} />
    </InboxModeContext.Provider>,
  );
}

afterEach(() => apiFetch.mockReset());

describe('ComposerPhone after the 24 h window', () => {
  it.each(['admin', 'sales'] as const)('%s on a Kapso chat line: the note, the box, the toggle', async (mode) => {
    show(mode, true);
    expect(screen.getByText(t.inbox.tryAfterWindow)).toBeTruthy();
    expect(screen.queryByText(t.inbox.sessionClosed)).toBeNull();
    expect(box()).toBeTruthy();
    await waitFor(() => expect(toggle()).toBeTruthy());
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
