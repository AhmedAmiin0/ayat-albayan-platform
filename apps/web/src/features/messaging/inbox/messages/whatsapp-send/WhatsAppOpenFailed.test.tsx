import type { MessageView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { apiSend } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { message } from '@/features/messaging/inbox/testing/inbox-fixture';
import { WhatsAppSendLine } from './WhatsAppSendLine';

vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(), apiSend: vi.fn() }));

// The browser blocked the tab: the row is marked (never sent twice), the bubble offers a plain link
// to WhatsApp Web and «تراجع», which puts it back in the queue through the retry endpoint.

const held = message({
  id: 'm-held',
  direction: 'outbound',
  status: 'queued',
  error_code: 'awaiting_reply',
  body: 'سطر أول\nسطر ثانٍ 🌙',
  phone_e164: '+966500000001',
});
const marked: MessageView = { ...held, status: 'sent_manually', error_code: null };

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const ui = (m: MessageView) => (
    <QueryClientProvider client={client}>
      <WhatsAppSendLine message={m} />
    </QueryClientProvider>
  );
  return { client, ui, ...render(ui(held)) };
}

it('blocked tab: after the mark, «افتح واتساب» and «تراجع» (retry)', async () => {
  vi.mocked(apiSend).mockResolvedValue(marked);
  const open = vi.spyOn(window, 'open').mockReturnValue(null);
  const s = setup();
  fireEvent.click(screen.getByRole('button', { name: t.messages.whatsappSend.action }));
  await waitFor(() => expect(s.client.isMutating()).toBe(0));
  open.mockRestore();
  s.rerender(s.ui(marked));
  expect(screen.getByText(t.messages.whatsappSend.openFailed)).toBeTruthy();
  const link = screen.getByRole('link', { name: t.messages.whatsappSend.openAgain });
  expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  expect(link.getAttribute('href')).toContain('https://web.whatsapp.com/send?phone=966500000001&text=');
  expect(link.getAttribute('href')).toContain('%0A');
  vi.mocked(apiSend).mockResolvedValue({ ...marked, status: 'queued' });
  fireEvent.click(screen.getByRole('button', { name: t.messages.whatsappSend.undo }));
  await waitFor(() => expect(apiSend).toHaveBeenLastCalledWith('POST', '/messages/m-held/retry?undo=whatsapp'));
});

it('a sent_manually row this session did not mark: no undo line', () => {
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <WhatsAppSendLine message={marked} />
    </QueryClientProvider>,
  );
  expect(screen.queryByText(t.messages.whatsappSend.undo)).toBeNull();
});
