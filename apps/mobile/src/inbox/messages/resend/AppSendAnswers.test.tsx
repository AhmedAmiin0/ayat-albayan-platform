import type { MessageView } from '@ab/shared';
import { useState } from 'react';
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
// so the bubble's line and the «!» sheet give the stop path back (sent-manually), never a retry.

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

test('unconfirmed: never put back to sending (no «لا», no retry)', async () => {
  await show(unconfirmed);
  expect(button(t.messages.retry)).toBeNull();
  expect(button(t.messages.whatsappSend.yes)).toBeTruthy();
});

test('the «!» sheet of an unconfirmed row: «نعم» closes it and records the send; no retry', async () => {
  const props = { phone: PHONE, onClose: jest.fn(), onError: jest.fn() };
  await renderWithQuery(<FailedSheet {...props} message={unconfirmed} />);
  const s = within(screen.getByTestId('failed-sheet'));
  expect(s.queryByRole('button', { name: t.messages.retry })).toBeNull();
  await fireEvent.press(s.getByRole('button', { name: t.messages.whatsappSend.yes }));
  expect(props.onClose).toHaveBeenCalled();
  await waitFor(() => expect(send).toHaveBeenCalledWith('POST', '/messages/m-held/sent-manually'));
});

test('the «!» sheet: a failed «نعم» shows in the chat notice after the sheet closed', async () => {
  send.mockReset().mockRejectedValue(new Error('offline'));
  const onError = jest.fn();
  function Chat() {
    const [row, setRow] = useState<MessageView | null>(unconfirmed);
    const close = () => setRow(null);
    return <FailedSheet phone={PHONE} message={row} onClose={close} onError={onError} />;
  }
  await renderWithQuery(<Chat />);
  const s = within(screen.getByTestId('failed-sheet'));
  await fireEvent.press(s.getByRole('button', { name: t.messages.whatsappSend.yes }));
  await waitFor(() => expect(onError).toHaveBeenCalledWith(t.common.error));
});

test('the «!» sheet of a pending row: «أرسلتها»', async () => {
  const props = { phone: PHONE, onClose: jest.fn(), onError: jest.fn() };
  await renderWithQuery(<FailedSheet {...props} message={pending} />);
  const s = within(screen.getByTestId('failed-sheet'));
  expect(s.getByRole('button', { name: t.messages.whatsappSend.sentIt })).toBeTruthy();
});
