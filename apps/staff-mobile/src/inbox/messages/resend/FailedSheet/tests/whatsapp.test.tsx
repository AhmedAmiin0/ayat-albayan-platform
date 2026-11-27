import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { ApiError, apiSend, t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { failed, message, PHONE } from '@/inbox/shared/thread-fixtures';
import { FailedSheet } from '@/inbox/messages/resend/FailedSheet/FailedSheet';

jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: async () => ({}),
  apiSend: jest.fn(),
}));

// A text the 24 h window stopped offers send via WhatsApp; other failures keep the old actions.

const HELD_ID = 'c3333333-3333-4333-8333-333333333333';
const held = message({
  id: HELD_ID,
  direction: 'outbound',
  status: 'failed',
  error_code: 'reopen_failed',
  body: 'السلام عليكم',
  phone_e164: PHONE,
  click_to_chat: 'https://wa.me/x',
});
const props = { phone: PHONE, onClose: jest.fn(), onError: jest.fn() };

test('a window failure: «أرسل عبر واتساب», no «أرسلها بنفسك»; app-send, then open', async () => {
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  jest.mocked(apiSend).mockResolvedValue({ ...held, app_send_until: '2026-11-06T10:10:00Z' });
  await renderWithQuery(<FailedSheet {...props} message={held} />);
  const s = within(screen.getByTestId('failed-sheet'));
  expect(s.queryByRole('button', { name: t.messages.clickToChat })).toBeNull();
  await fireEvent.press(s.getByRole('button', { name: t.messages.whatsappSend.action }));
  await waitFor(() => expect(openURL).toHaveBeenCalled());
  expect(apiSend).toHaveBeenCalledWith('POST', `/messages/${HELD_ID}/app-send`, undefined);
  expect(props.onClose).toHaveBeenCalled();
});

test('a refused app-send: the chat notice says why from the 409 status, nothing opens', async () => {
  const openURL = jest.spyOn(Linking, 'openURL').mockReset();
  const refused = new ApiError(409, { code: 'not_app_send', status: 'sent', error_code: null });
  jest.mocked(apiSend).mockRejectedValue(refused);
  await renderWithQuery(<FailedSheet {...props} message={held} />);
  const s = within(screen.getByTestId('failed-sheet'));
  await fireEvent.press(s.getByRole('button', { name: t.messages.whatsappSend.action }));
  const words = t.messages.whatsappSend.alreadySent;
  await waitFor(() => expect(props.onError).toHaveBeenCalledWith(words));
  expect(openURL).not.toHaveBeenCalled();
});

test('another failure (131049): the old hand-off, no «أرسل عبر واتساب»', async () => {
  await renderWithQuery(<FailedSheet {...props} message={{ ...failed, template_key: null }} />);
  const s = within(screen.getByTestId('failed-sheet'));
  expect(s.getByRole('button', { name: t.messages.clickToChat })).toBeTruthy();
  expect(s.queryByRole('button', { name: t.messages.whatsappSend.action })).toBeNull();
});
