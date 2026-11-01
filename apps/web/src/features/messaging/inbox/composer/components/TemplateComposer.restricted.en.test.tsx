import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PHONE } from '@/features/messaging/inbox/testing/inbox-fixture';
import { InboxModeContext } from '@/features/messaging/inbox/shared/mode';
import { TemplateComposer } from './TemplateComposer';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';

vi.mock('@/lib/i18n/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/i18n/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/lib/http/supabase', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'x' } } }) } } }));

describe('TemplateComposer — restricted, English', () => {
  it('a teacher with no allowed template reads the English empty note', async () => {
    routeFetch(apiFetch, [
      ['/auth/me', { id: 'u1', email: null, role: 'teacher', permissions: ['messages.read'] }],
      ['/messaging/templates', []],
    ]);
    renderWithClient(
      <InboxModeContext.Provider value="teacher">
        <TemplateComposer phone={PHONE} context={{}} teacher={false} />
      </InboxModeContext.Provider>,
    );
    expect(await screen.findByText(en.inbox.composer.noAllowedHelp)).toBeTruthy();
    expect(screen.getByText(/ask the admin to enable a template/)).toBeTruthy();
  });
});
