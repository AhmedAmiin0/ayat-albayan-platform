import type { MessageView } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { apiSend } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { MessageBubble } from '@/inbox/messages/components/MessageBubble';
import { message, PHONE } from '@/inbox/shared/thread-fixtures';
import { FailedSheet } from './FailedSheet';

jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: async () => ({}),
  apiSend: jest.fn(),
}));

// Staff's answers about a «أرسل عبر واتساب» (docs/19): the platform never sends such a row itself,
// so the bubble's line and the «!» sheet give the stop path back (sent-manually) and the hold.

const held = message({
  id: 'm-held',
  direction: 'outbound',
  status: 'queued',
  error_code: 'awaiting_reply',
  body: 'السلام عليكم',
  phone_e164: PHONE,
});
const pending = { ...held, app_send_until: new Date(Date.now() + 5 * 60_000).toISOString() };
const unconfirmed: MessageView = { ...held, status: 'failed', error_code: 'app_send_unconfirmed' };
const show = (m: MessageView) => renderWithQuery(<MessageBubble message={m} phone={PHONE} />);
const button = (name: string) => screen.queryByRole('button', { name });
const send = jest.mocked(apiSend);

beforeEach(() => send.mockReset().mockResolvedValue({ ...held, status: 'sent_manually' }));

test('pending: «أرسلتها» records the manual send', async () => {
  await show(pending);
  await fireEvent.press(button(t.messages.whatsappSend.sentIt) as never);
  await waitFor(() => expect(send).toHaveBeenCalledWith('POST', '/messages/m-held/sent-manually'));
});

test('the plain offer: no answers', async () => {
  await show(held);
  expect(button(t.messages.whatsappSend.sentIt)).toBeNull();
  expect(button(t.messages.whatsappSend.yes)).toBeNull();
});

test('unconfirmed: the question, «نعم» = sent-manually, and the action again', async () => {
  await show(unconfirmed);
  expect(screen.getByText(t.messages.whatsappSend.askSent)).toBeTruthy();
  expect(button(t.messages.whatsappSend.action)).toBeTruthy();
  await fireEvent.press(button(t.messages.whatsappSend.yes) as never);
  await waitFor(() => expect(send).toHaveBeenCalledWith('POST', '/messages/m-held/sent-manually'));
});

test('unconfirmed: «لا، أعدها للانتظار» = the retry (held again by the server)', async () => {
  await show(unconfirmed);
  await fireEvent.press(button(t.messages.whatsappSend.backToHold) as never);
  await waitFor(() => expect(send).toHaveBeenCalledWith('POST', '/messages/m-held/retry'));
});

test('the «!» sheet of an unconfirmed row: «نعم» closes it and records the send; no retry', async () => {
  const props = { phone: PHONE, onClose: jest.fn(), onError: jest.fn() };
  await renderWithQuery(<FailedSheet {...props} message={unconfirmed} />);
  const s = within(screen.getByTestId('failed-sheet'));
  expect(s.queryByRole('button', { name: t.messages.retry })).toBeNull();
  expect(s.getByRole('button', { name: t.messages.whatsappSend.backToHold })).toBeTruthy();
  await fireEvent.press(s.getByRole('button', { name: t.messages.whatsappSend.yes }));
  expect(props.onClose).toHaveBeenCalled();
  await waitFor(() => expect(send).toHaveBeenCalledWith('POST', '/messages/m-held/sent-manually'));
});

test('the «!» sheet of a pending row: «أرسلتها»', async () => {
  const props = { phone: PHONE, onClose: jest.fn(), onError: jest.fn() };
  await renderWithQuery(<FailedSheet {...props} message={pending} />);
  const s = within(screen.getByTestId('failed-sheet'));
  expect(s.getByRole('button', { name: t.messages.whatsappSend.sentIt })).toBeTruthy();
});
