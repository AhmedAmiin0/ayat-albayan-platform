import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PHONE } from '@/features/messaging/inbox/testing/inbox-fixture';
import { InboxModeContext } from '@/features/messaging/inbox/shared/mode';
import { NewChatForm } from '@/features/messaging/inbox/threads/list/NewChatForm';
import { NewThread } from './NewThread';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';

vi.mock('@/lib/i18n/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/i18n/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/lib/http/supabase', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'x' } } }) } } }));

describe('starting a conversation, English', () => {
  it('the new chat form and the no-template note read in English', async () => {
    routeFetch(apiFetch, [
      ['/auth/me', { id: 'u1', email: null, role: 'sales', permissions: ['messages.read'] }],
      ['/messaging/templates', []],
    ]);
    renderWithClient(
      <InboxModeContext.Provider value="sales">
        <NewChatForm onOpen={() => undefined} />
        <NewThread phone={PHONE} lessons={[]} />
      </InboxModeContext.Provider>,
    );
    expect(screen.getByRole('button', { name: 'Open the chat' })).toBeTruthy();
    // Sales with nothing on the allow-list yet: why she cannot start it (W7), no composer.
    expect(await screen.findByText(en.inbox.newChat.noAllowed)).toBeTruthy();
    expect(screen.queryByText(en.inbox.newChat.firstTemplate)).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('without messages.read: the permission line in English (round 2 J)', async () => {
    routeFetch(apiFetch, [['/auth/me', { id: 'u1', email: null, role: 'sales', permissions: [] }]]);
    renderWithClient(
      <InboxModeContext.Provider value="sales">
        <NewThread phone={PHONE} lessons={[]} />
      </InboxModeContext.Provider>,
    );
    expect(await screen.findByText(en.inbox.composer.noPermissionHelp)).toBeTruthy();
    expect(screen.queryByText(en.inbox.newChat.noAllowed)).toBeNull();
  });
});
