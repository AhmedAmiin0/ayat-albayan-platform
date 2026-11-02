import { screen, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { failed, PHONE } from '@/inbox/shared/thread-fixtures';
import { errorLine } from '@/inbox/messages/hooks/message-text';
import { FailedSheet } from './FailedSheet';

jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: async () => ({}),
  apiSend: jest.fn(),
}));

// Owner 2026-10-31 («dont use templates»): a text tried after the 24 h window that WhatsApp
// refused (131047, final) shows its failed text only: no retry, no template action.
test('131047: the failed text, no retry and no «أرسل قالبًا»', async () => {
  const m = { ...failed, error_code: '131047' };
  const props = { phone: PHONE, onClose: jest.fn(), onError: jest.fn() };
  await renderWithQuery(<FailedSheet {...props} message={m} />);
  const s = within(screen.getByTestId('failed-sheet'));
  expect(s.getByText(errorLine(m))).toBeTruthy();
  expect(s.queryByRole('button', { name: t.messages.retry })).toBeNull();
  expect(s.queryByRole('button', { name: t.inbox.composer.sendTemplate })).toBeNull();
});

// Owner 2026-11-01: a payment link leaves as a text, so its refusal reads the same on its bubble.
test('a payment link refused with 131047: the same failed text, no retry', async () => {
  const body = 'رابط الدفع: https://app.example.test/pay/tok_1';
  const m = { ...failed, body, error_code: '131047' };
  const props = { phone: PHONE, onClose: jest.fn(), onError: jest.fn() };
  await renderWithQuery(<FailedSheet {...props} message={m} />);
  const s = within(screen.getByTestId('failed-sheet'));
  expect(s.getByText(errorLine(m))).toBeTruthy();
  expect(s.queryByRole('button', { name: t.messages.retry })).toBeNull();
});
