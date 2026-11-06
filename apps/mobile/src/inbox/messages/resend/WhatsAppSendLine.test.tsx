import type { MessageView } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { apiSend } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { MessageBubble } from '@/inbox/messages/components/MessageBubble';
import { message, PHONE } from '@/inbox/shared/thread-fixtures';
import { ThreadModeProvider } from '@/inbox/thread/hooks/thread-mode';

jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: async () => ({}),
  apiSend: jest.fn(),
}));

// «أرسل عبر واتساب» in the mobile bubble (owner 2026-11-06): only under a staff text the 24 h
// window stopped; it marks the row sent from WhatsApp FIRST, then opens wa.me; «تراجع» if not.

const held = message({
  id: 'm-held',
  direction: 'outbound',
  status: 'queued',
  error_code: 'awaiting_reply',
  body: 'السلام عليكم\nموعد الحلقة 🌙',
  phone_e164: PHONE,
});
const action = () => screen.queryByRole('button', { name: t.messages.whatsappSend.action });
const show = (m: MessageView) => renderWithQuery(<MessageBubble message={m} phone={PHONE} />);
const send = jest.mocked(apiSend);
const openURL = jest.spyOn(Linking, 'openURL');

beforeEach(() => {
  send.mockReset();
  openURL.mockReset().mockResolvedValue(true);
});

test('a held text: the hint and a 44pt action', async () => {
  await show(held);
  expect(screen.getByText(t.messages.whatsappSend.hint)).toBeTruthy();
  expect(action()).toBeTruthy();
});

test.each(['reopen_failed', 'reopen_tries_used', 'hold_expired', '131047'])('failed %s: shown', async (code) => {
  await show({ ...held, status: 'failed', error_code: code });
  expect(action()).toBeTruthy();
});

test.each<[string, Partial<MessageView>]>([
  ['a file', { media_mime: 'image/jpeg' }],
  ['another failure', { status: 'failed', error_code: '131026' }],
  ['an inbound message', { direction: 'inbound' }],
])('%s: not shown', async (_name, patch) => {
  await show({ ...held, ...patch });
  expect(action()).toBeNull();
});

test('teacher mode: never shown', async () => {
  const mode = { kind: 'teacher' as const, teacherId: 't1' };
  await renderWithQuery(
    <ThreadModeProvider value={mode}>
      <MessageBubble message={held} phone={PHONE} />
    </ThreadModeProvider>,
  );
  expect(action()).toBeNull();
});

test('mark first, then wa.me with the digits and the encoded text', async () => {
  send.mockResolvedValue({ ...held, status: 'sent_manually', error_code: null });
  await show(held);
  await fireEvent.press(action() as never);
  await waitFor(() => expect(openURL).toHaveBeenCalled());
  expect(send).toHaveBeenCalledWith('POST', '/messages/m-held/sent-manually');
  expect(send.mock.invocationCallOrder[0]).toBeLessThan(openURL.mock.invocationCallOrder[0] ?? 0);
  const url = String(openURL.mock.calls[0]?.[0]);
  expect(url.startsWith(`https://wa.me/${PHONE.slice(1)}?text=`)).toBe(true);
  expect(decodeURIComponent(url.split('?text=')[1] ?? '')).toBe(held.body);
});

test('a refused mark: WhatsApp never opens, the reason shows', async () => {
  send.mockRejectedValue(new Error('boom'));
  await show(held);
  await fireEvent.press(action() as never);
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  expect(openURL).not.toHaveBeenCalled();
});

test('WhatsApp did not open: «تراجع» puts it back through retry', async () => {
  const marked = { ...held, status: 'sent_manually' as const, error_code: null };
  send.mockResolvedValue(marked);
  openURL.mockRejectedValue(new Error('no handler'));
  const { client, rerender } = await show(held);
  await fireEvent.press(action() as never);
  await waitFor(() => expect(client.isMutating()).toBe(0));
  await rerender(<MessageBubble message={marked} phone={PHONE} />);
  expect(await screen.findByText(t.messages.whatsappSend.openFailed)).toBeTruthy();
  send.mockResolvedValue({ ...marked, status: 'queued' });
  await fireEvent.press(screen.getByRole('button', { name: t.messages.whatsappSend.undo }));
  await waitFor(() => expect(send).toHaveBeenLastCalledWith('POST', '/messages/m-held/retry?undo=whatsapp'));
});
