import type { MessageView } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { ApiError, apiSend } from '@/core/lib/http/api';
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

// «أرسل عبر واتساب» in the mobile bubble (owner 2026-11-06, docs/19): only under a staff text the
// 24 h window stopped; app-send FIRST (a short pending window), then wa.me; no undo anywhere.

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

const pending = { ...held, app_send_until: new Date(Date.now() + 5 * 60_000).toISOString() };
const refusal = (status: string, error_code: string | null = null) =>
  new ApiError(409, { code: 'not_app_send', status, error_code });

test('app-send first, then wa.me with the digits and the encoded text', async () => {
  send.mockResolvedValue(pending);
  await show(held);
  await fireEvent.press(action() as never);
  await waitFor(() => expect(openURL).toHaveBeenCalled());
  expect(send).toHaveBeenCalledWith('POST', '/messages/m-held/app-send');
  expect(send).not.toHaveBeenCalledWith('POST', '/messages/m-held/sent-manually');
  expect(send.mock.invocationCallOrder[0]).toBeLessThan(openURL.mock.invocationCallOrder[0] ?? 0);
  const url = String(openURL.mock.calls[0]?.[0]);
  expect(url.startsWith(`https://wa.me/${PHONE.slice(1)}?text=`)).toBe(true);
  expect(decodeURIComponent(url.split('?text=')[1] ?? '')).toBe(held.body);
});

test.each<[string, ApiError | Error, string]>([
  ['claimed by the sender', refusal('queued', 'sending'), t.messages.alreadySending],
  ['already sent', refusal('sent'), t.messages.whatsappSend.alreadySent],
  ['sent by hand', refusal('sent_manually'), t.messages.whatsappSend.alreadySent],
  ['moved otherwise', refusal('failed', 'network'), t.messages.whatsappSend.notNow],
  ['a network error', new Error('boom'), t.common.error],
])('refused (%s): WhatsApp never opens, the words fit the status', async (_n, error, text) => {
  send.mockRejectedValue(error);
  await show(held);
  await fireEvent.press(action() as never);
  expect(await screen.findByText(text)).toBeTruthy();
  expect(openURL).not.toHaveBeenCalled();
});

test('pending: «جارٍ الإرسال من واتساب…», re-open posts app-send again and opens', async () => {
  send.mockResolvedValue(pending);
  await show(pending);
  expect(screen.getByText(t.messages.whatsappSend.pending)).toBeTruthy();
  expect(action()).toBeNull();
  const again = screen.getByRole('button', { name: t.messages.whatsappSend.openAgain });
  await fireEvent.press(again);
  await waitFor(() => expect(openURL).toHaveBeenCalled());
  expect(send).toHaveBeenCalledWith('POST', '/messages/m-held/app-send');
});

test('a window that passed: the offer again, as before the tap', async () => {
  await show({ ...held, app_send_until: new Date(Date.now() - 60_000).toISOString() });
  expect(action()).toBeTruthy();
  expect(screen.queryByText(t.messages.whatsappSend.pending)).toBeNull();
});

test('WhatsApp did not open: no «تراجع», the line stays pending with re-open', async () => {
  send.mockResolvedValue(pending);
  openURL.mockRejectedValue(new Error('no handler'));
  const { client, rerender } = await show(held);
  await fireEvent.press(action() as never);
  await waitFor(() => expect(client.isMutating()).toBe(0));
  await rerender(<MessageBubble message={pending} phone={PHONE} />);
  expect(screen.getByRole('button', { name: t.messages.whatsappSend.openAgain })).toBeTruthy();
  expect(screen.queryByText('تراجع')).toBeNull();
});
