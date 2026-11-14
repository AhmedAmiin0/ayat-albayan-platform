import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { InboxModeContext } from '@/features/messaging/inbox/shared/mode';
import { message, PHONE, template, thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { getDraft, setDraft } from '@/features/messaging/inbox/composer/lib/draft-store';
import { SEND_UNCONFIRMED } from '@ab/client-core';
import { ReopenBar } from './ReopenBar';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'x' } } }) } },
}));
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

// «أرسِل الآن داخل قالب» (owner 2026-11-14): the draft goes now inside academy_message. The API is
// faked: nothing reaches WhatsApp.

const BODY = 'السلام عليكم\nرسالة من الأكاديمية:\n\n{{1}}\n\nيسعدنا ردّكم.';
const chat = { line: 'chat' as const, sales_starter: true };
const ACADEMY = template({ ...chat, key: 'academy_message', params: ['var_1'], body_ar: BODY });
const WELCOME = template({ ...chat, key: 'welcome_greeting', params: [], body_ar: 'أهلًا' });
const ME = { id: 'u1', email: null, role: 'sales', permissions: ['messages.read'] };
const base = { context: {}, noneAllowed: null, trying: true, teacher: false };
const carry = () => screen.queryByRole('button', { name: t.inbox.reopenBar.carry });

function show(list = [WELCOME, ACADEMY], draft = 'سطر أول\n\nسطر   ثانٍ') {
  setDraft(PHONE, { text: draft, failed: null });
  routeFetch(apiFetch, [['/auth/me', ME], ['/messaging/templates', list]]);
  renderWithClient(
    <InboxModeContext.Provider value="sales">
      <ReopenBar {...base} thread={thread({ session_open: false })} />
    </InboxModeContext.Provider>,
  );
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
  setDraft(PHONE, { text: '', failed: null });
});

describe('ReopenBar: «أرسِل الآن داخل قالب»', () => {
  it('approved and allowed, with a draft: shown beside the reopen button', async () => {
    show();
    expect(await screen.findByRole('button', { name: t.inbox.reopenBar.carry })).toBeTruthy();
  });

  it('not on this user’s list (not allowed or not approved): hidden', async () => {
    show([WELCOME]);
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalled());
    await screen.findByRole('button', { name: t.inbox.reopenBar.action });
    expect(carry()).toBeNull();
  });

  it('a draft whose send got no answer (the server may hold it): hidden', async () => {
    show();
    const failed = { text: 'نص', id: 'req-1', code: SEND_UNCONFIRMED };
    setDraft(PHONE, { text: 'نص', failed });
    await screen.findByRole('button', { name: t.inbox.reopenBar.action });
    await vi.waitFor(() => expect(carry()).toBeNull());
  });

  it('no draft: hidden', async () => {
    show(undefined, '   ');
    await screen.findByRole('button', { name: t.inbox.reopenBar.action });
    expect(carry()).toBeNull();
  });

  it('opens academy_message with the draft, previews it normalised, sends it as the reopen', async () => {
    show();
    apiSend.mockResolvedValue(message({ id: 'm-r', direction: 'outbound', status: 'queued' }));
    fireEvent.click(await screen.findByRole('button', { name: t.inbox.reopenBar.carry }));
    const box = await screen.findByLabelText(t.inbox.composer.freeText);
    expect((box as HTMLTextAreaElement).value).toBe('سطر أول\n\nسطر   ثانٍ');
    expect(screen.getByText(/سطر أول · سطر ثانٍ/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.inbox.composer.sendTemplate }));
    await waitFor(() => expect(apiSend).toHaveBeenCalled());
    expect(apiSend).toHaveBeenCalledWith('POST', `/threads/${encodeURIComponent(PHONE)}/template`, {
      key: 'academy_message',
      params: { '1': 'سطر أول · سطر ثانٍ' },
      clientRequestId: expect.any(String),
      reopen: true,
    });
    await waitFor(() => expect(getDraft(PHONE).text).toBe(''));
  });
});
