import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { PHONE } from '../../testing/inbox-fixture';
import { InboxModeContext } from '../../mode';
import { TemplateComposer } from './TemplateComposer';
import { renderWithClient, routeFetch } from '../../testing/test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/lib/http/supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'x' } } }) } },
}));

afterEach(() => apiFetch.mockReset());

// W7: staging has no template enabled for sales yet; tell her what she can do.
describe('TemplateComposer: sales with no template allowed', () => {
  it('the help line instead of the disabled select and «أرسل قالبًا» button', async () => {
    routeFetch(apiFetch, [
      ['/auth/me', { id: 'u1', email: null, role: 'sales', permissions: ['messages.read'] }],
      ['/messaging/templates', []],
    ]);
    renderWithClient(
      <InboxModeContext.Provider value="sales">
        <TemplateComposer phone={PHONE} context={{}} teacher={false} />
      </InboxModeContext.Provider>,
    );
    expect(await screen.findByText(t.inbox.composer.noAllowedHelp)).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('button', { name: t.inbox.composer.sendTemplate })).toBeNull();
  });
});
