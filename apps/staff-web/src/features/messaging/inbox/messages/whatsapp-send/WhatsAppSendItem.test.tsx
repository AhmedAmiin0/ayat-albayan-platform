import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { apiSend } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { ChatActionsProvider } from '@/features/messaging/inbox/shared/ChatActionsProvider';
import { message, PHONE, thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { MessageLog } from '@/features/messaging/inbox/messages/components/MessageLog';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';

vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(), apiSend: vi.fn() }));

// «أرسل عبر واتساب» in the bubble's menu (⋯): the same action as the bubble's line.

const base = {
  phone: PHONE,
  hasMore: false,
  loadingOlder: false,
  onOlder: vi.fn(),
  waitingKeys: new Set<string>(),
};
const held = message({
  id: 'm-held',
  direction: 'outbound',
  status: 'failed',
  error_code: 'reopen_failed',
  body: 'السلام عليكم',
  phone_e164: PHONE,
});

it('the menu item calls app-send, then opens WhatsApp Web', async () => {
  const tab = { opener: {}, location: { replace: vi.fn() }, close: vi.fn() };
  const open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
  vi.mocked(apiSend).mockResolvedValue({ ...held, app_send_until: '2026-11-06T12:10:00Z' });
  renderWithClient(
    <ChatActionsProvider thread={thread()} enabled>
      <MessageLog {...base} messages={[held]} />
    </ChatActionsProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: t.inbox.reply.menu }));
  const menu = screen.getByRole('button', { name: t.inbox.copy.label }).parentElement;
  fireEvent.click(within(menu as HTMLElement).getByRole('button', { name: t.messages.whatsappSend.action }));
  await waitFor(() => expect(tab.location.replace).toHaveBeenCalled());
  expect(apiSend).toHaveBeenCalledWith('POST', '/messages/m-held/app-send');
  expect(String(tab.location.replace.mock.calls[0]?.[0])).toMatch(/^https:\/\/web\.whatsapp\.com\/send\?phone=/);
  open.mockRestore();
});
