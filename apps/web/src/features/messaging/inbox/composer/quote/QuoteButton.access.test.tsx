import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakePricingApi } from '@/features/finance/pricing/fake-pricing-api';
import { t } from '@/lib/i18n/i18n';
import { ComposerPhone } from '@/features/messaging/inbox/composer/components/ComposerPhone';
import { template, thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { InboxModeContext, type InboxMode } from '@/features/messaging/inbox/shared/mode';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/lib/http/supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'x' } } }) } },
}));

const OPEN = { session_open: true, last_inbound_at: new Date().toISOString() };
const CLOSED = { session_open: false, last_inbound_at: null };
const props = { context: {}, gateNote: null, mode: 'text' as const, onMode: vi.fn(), teacher: false };

async function show(input: { mode: InboxMode; open?: boolean; permissions?: string[] }) {
  const permissions = input.permissions ?? ['messages.read', 'inbox.send', 'pricing.read'];
  apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/auth/me')) return { id: 'u1', email: null, role: input.mode, permissions };
    if (path.startsWith('/pricing/')) return fakePricingApi(path);
    return path.startsWith('/messaging/templates') ? [template()] : [];
  });
  renderWithClient(
    <InboxModeContext.Provider value={input.mode}>
      <ComposerPhone thread={thread(input.open === false ? CLOSED : OPEN)} {...props} />
    </InboxModeContext.Provider>,
  );
  await screen.findByRole('textbox').catch(() => undefined);
}
const button = () => screen.queryByRole('button', { name: t.inbox.quote.open });

afterEach(() => {
  apiFetch.mockReset();
  cleanup();
});

describe('ComposerPhone: «عرض سعر»', () => {
  it('admin and sales (pricing.read) get the button beside the box; it opens the sheet', async () => {
    for (const mode of ['admin', 'sales'] as const) {
      await show({ mode });
      expect(await screen.findByRole('button', { name: t.inbox.quote.open })).toBeTruthy();
      cleanup();
    }
    await show({ mode: 'sales' });
    fireEvent.click(await screen.findByRole('button', { name: t.inbox.quote.open }));
    expect(await screen.findByRole('dialog', { name: t.inbox.quote.title })).toBeTruthy();
  });

  it('after the window it stays (copy still works), beside the templates', async () => {
    await show({ mode: 'sales', open: false });
    expect(await screen.findByRole('button', { name: t.inbox.quote.open })).toBeTruthy();
  });

  it('a teacher never sees it; nor a sales role without pricing.read', async () => {
    await show({ mode: 'teacher' });
    expect(button()).toBeNull();
    cleanup();
    await show({ mode: 'sales', permissions: ['messages.read', 'inbox.send'] });
    await screen.findByRole('button', { name: t.savedReplies.open });
    expect(button()).toBeNull();
  });
});
