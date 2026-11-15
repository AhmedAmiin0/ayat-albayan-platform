import { fireEvent, screen, waitFor } from '@testing-library/react';
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

const S = t.savedReplies;
const OPEN = { session_open: true, last_inbound_at: new Date().toISOString() };
const CLOSED = { session_open: false, last_inbound_at: null };
const props = { context: {}, gateNote: null, mode: 'text' as const, onMode: vi.fn(), teacher: false };

function show(input: { mode: InboxMode; open: boolean }) {
  routeFetch(apiFetch, [
    ['/auth/me', { id: 'u1', email: null, role: input.mode, permissions: ['messages.read', 'inbox.send'] }],
    ['/messaging/templates', [template()]],
  ]);
  renderWithClient(
    <InboxModeContext.Provider value={input.mode}>
      <ComposerPhone thread={thread(input.open ? OPEN : CLOSED)} {...props} />
    </InboxModeContext.Provider>,
  );
}
const button = () => screen.queryByRole('button', { name: S.open });

afterEach(() => apiFetch.mockReset());

describe('ComposerPhone: «الردود السريعة»', () => {
  it('inside the window: the button beside the box, for the admin and sales', async () => {
    for (const mode of ['admin', 'sales'] as const) {
      show({ mode, open: true });
      expect(button()?.getAttribute('aria-disabled')).toBeNull();
      document.body.innerHTML = '';
    }
  });

  it('after the window: shown locked, with why, beside the templates', async () => {
    show({ mode: 'sales', open: false });
    await waitFor(() => expect(button()).toBeTruthy());
    expect(button()?.getAttribute('aria-disabled')).toBe('true');
    expect(button()?.getAttribute('title')).toBe(S.closedHint);
    const hint = document.getElementById(button()?.getAttribute('aria-describedby') ?? '');
    expect(hint?.textContent).toBe(S.closedHint);
    expect(hint?.hidden).toBe(true);
  });

  it('after the window: a tap on the locked button shows why in the row', async () => {
    show({ mode: 'sales', open: false });
    await waitFor(() => expect(button()).toBeTruthy());
    const hint = document.getElementById(button()?.getAttribute('aria-describedby') ?? '');
    // A tap shows the reason in the row (no tooltip on touch screens); a second tap hides it.
    const locked = button();
    if (locked) fireEvent.click(locked);
    expect(hint?.hidden).toBe(false);
    expect(locked?.getAttribute('aria-expanded')).toBe('true');
    if (locked) fireEvent.click(locked);
    expect(hint?.hidden).toBe(true);
  });

  it('never for a teacher', async () => {
    show({ mode: 'teacher', open: true });
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(button()).toBeNull();
  });
});
