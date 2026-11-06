import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { apiSend } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { failed, message, PHONE } from '@/inbox/shared/thread-fixtures';
import { FailedSheet } from './FailedSheet';

jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: async () => ({}),
  apiSend: jest.fn(),
}));

// The «!» sheet (the bubble's actions menu on mobile): «أرسل عبر واتساب» replaces the wa.me
// hand-off for a text the 24 h window stopped; any other failure keeps the old actions.

const held = message({
  id: 'm-held',
  direction: 'outbound',
  status: 'failed',
  error_code: 'reopen_failed',
  body: 'السلام عليكم',
  phone_e164: PHONE,
  click_to_chat: 'https://wa.me/x',
});
const props = { phone: PHONE, onClose: jest.fn(), onError: jest.fn() };

test('a window failure: «أرسل عبر واتساب», no «أرسلها بنفسك»; mark, then open', async () => {
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  jest.mocked(apiSend).mockResolvedValue({ ...held, status: 'sent_manually' });
  await renderWithQuery(<FailedSheet {...props} message={held} />);
  const s = within(screen.getByTestId('failed-sheet'));
  expect(s.queryByRole('button', { name: t.messages.clickToChat })).toBeNull();
  await fireEvent.press(s.getByRole('button', { name: t.messages.whatsappSend.action }));
  await waitFor(() => expect(openURL).toHaveBeenCalled());
  expect(apiSend).toHaveBeenCalledWith('POST', '/messages/m-held/sent-manually');
  expect(props.onClose).toHaveBeenCalled();
});

test('another failure (131049): the old hand-off, no «أرسل عبر واتساب»', async () => {
  await renderWithQuery(<FailedSheet {...props} message={{ ...failed, template_key: null }} />);
  const s = within(screen.getByTestId('failed-sheet'));
  expect(s.getByRole('button', { name: t.messages.clickToChat })).toBeTruthy();
  expect(s.queryByRole('button', { name: t.messages.whatsappSend.action })).toBeNull();
});
