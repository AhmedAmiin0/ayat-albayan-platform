import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { ComposerPhone } from './ComposerPhone';
import { template, thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { InboxModeContext, type InboxMode } from '@/features/messaging/inbox/shared/mode';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/lib/http/supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'x' } } }) } },
}));

const OPEN = {
  session_open: true,
  last_inbound_at: new Date(Date.now() - 3_600_000).toISOString(),
};
const CLOSED = { session_open: false, last_inbound_at: null };
const props = {
  context: {},
  gateNote: null,
  mode: 'text' as const,
  onMode: vi.fn(),
  teacher: false,
};
const toggle = () => screen.queryByRole('button', { name: t.inbox.composer.modeTemplate });

function show(input: { mode: InboxMode; open: boolean; rows: unknown[] }) {
  routeFetch(apiFetch, [
    [
      '/auth/me',
      {
        id: 'u1',
        email: null,
        role: input.mode,
        permissions: ['messages.read', 'templates.manage'],
      },
    ],
    ['/messaging/templates', input.rows],
  ]);
  renderWithClient(
    <InboxModeContext.Provider value={input.mode}>
      <ComposerPhone thread={thread(input.open ? OPEN : CLOSED)} {...props} />
    </InboxModeContext.Provider>,
  );
}

afterEach(() => apiFetch.mockReset());

// W7: no template allowed for sales: no toggle to an empty list, and after the window one help line.
describe('ComposerPhone with no template allowed', () => {
  it('sales, open window: the message box without the template toggle', async () => {
    show({ mode: 'sales', open: true, rows: [] });
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/messaging/templates'));
    await waitFor(() => expect(toggle()).toBeNull());
    expect(screen.getByRole('textbox', { name: t.inbox.composer.messageLabel })).toBeTruthy();
  });

  it('sales, closed window: the help line only', async () => {
    show({ mode: 'sales', open: false, rows: [] });
    expect(await screen.findByText(t.inbox.composer.noAllowedHelp)).toBeTruthy();
    expect(screen.queryByText(t.inbox.sessionClosed)).toBeNull(); // «فأرسل قالبًا» would mislead
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: t.inbox.composer.sendTemplate })).toBeNull();
  });

  it('sales with an allowed template keeps the toggle', async () => {
    show({ mode: 'sales', open: true, rows: [template({ key: 'free_trial_invite' })] });
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/messaging/templates'));
    await new Promise((r) => setTimeout(r, 20));
    expect(toggle()).toBeTruthy();
  });

  it('the admin keeps the toggle and the template form on an empty list', async () => {
    show({ mode: 'admin', open: false, rows: [] });
    expect(
      await screen.findByRole('combobox', { name: t.inbox.composer.chooseTemplate }),
    ).toBeTruthy();
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/messaging/templates'));
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText(t.inbox.composer.noAllowedHelp)).toBeNull();
  });
});
