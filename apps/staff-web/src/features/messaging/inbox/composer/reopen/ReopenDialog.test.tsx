import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { InboxModeContext } from '@/features/messaging/inbox/shared/mode';
import { message, PHONE, template, thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { ReopenDialog } from './ReopenDialog';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'x' } } }) } },
}));
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

// «إعادة فتح المحادثة» (owner 2026-11-14): the academy template picked and filled, reopen: true.
// The API is faked: nothing reaches WhatsApp.

const chat = { line: 'chat' as const, sales_starter: true, params: ['contact_name'], body_ar: 'أهلًا {{1}}' };
const WELCOME = template({ ...chat, key: 'welcome_greeting', meta_name: 'welcome_greeting' });
const INVITE = template({ ...chat, key: 'free_trial_invite', meta_name: 'free_trial_invite' });
const NOTICE = template({ key: 'renewal_due', params: [] }); // the notifications line
const ME = { id: 'u1', email: null, role: 'sales', permissions: ['messages.read'] };
const onClose = vi.fn();
const select = () => screen.findByRole('combobox', { name: t.inbox.composer.chooseTemplate });

function open(preferred = 'welcome_greeting') {
  routeFetch(apiFetch, [['/auth/me', ME], ['/messaging/templates', [INVITE, NOTICE, WELCOME]]]);
  const th = thread({ session_open: false, reopen_template: preferred });
  renderWithClient(
    <InboxModeContext.Provider value="sales">
      <ReopenDialog thread={th} context={{ contactName: 'أم سهيلة' }} teacher={false} onClose={onClose} />
    </InboxModeContext.Provider>,
  );
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
  onClose.mockReset();
});

describe('ReopenDialog', () => {
  it('chat-line templates only, the academy one picked, its name filled and previewed', async () => {
    open();
    const list = await select();
    expect((list as HTMLSelectElement).value).toBe('welcome_greeting');
    expect(within(list).queryByText(t.templates.names.renewal_due)).toBeNull();
    expect(within(list).getAllByRole('option')).toHaveLength(3); // «—» + two chat-line ones
    expect(screen.getByText('أهلًا أم سهيلة')).toBeTruthy();
  });

  it('sends it through the template route with reopen: true, then closes', async () => {
    open();
    apiSend.mockResolvedValue(message({ id: 'm-r', direction: 'outbound', status: 'queued' }));
    await select();
    fireEvent.click(screen.getByRole('button', { name: t.inbox.composer.sendTemplate }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(apiSend).toHaveBeenCalledWith('POST', `/threads/${encodeURIComponent(PHONE)}/template`, {
      key: 'welcome_greeting',
      params: { '1': 'أم سهيلة' },
      clientRequestId: expect.any(String),
      reopen: true,
    });
  });

  it('the setting is not on this user’s list: the first allowed chat-line one', async () => {
    open('not_allowed_here');
    expect(((await select()) as HTMLSelectElement).value).toBe('free_trial_invite');
  });
});
