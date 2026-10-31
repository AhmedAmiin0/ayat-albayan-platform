import { fireEvent, screen, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { failed, PHONE } from '@/inbox/shared/thread-fixtures';
import { FailedSheet } from './FailedSheet';

jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: async () => ({}),
  apiSend: jest.fn(),
}));

// Owner 2026-10-31: a text tried after the 24 h window that WhatsApp refused (131047, final).
const onClose = jest.fn();
const onTemplate = jest.fn();
const onError = jest.fn();

async function sheet(code: string) {
  const m = { ...failed, error_code: code };
  const props = { phone: PHONE, onClose, onError, onTemplate };
  await renderWithQuery(<FailedSheet {...props} message={m} />);
  return within(screen.getByTestId('failed-sheet'));
}

beforeEach(() => {
  onClose.mockReset();
  onTemplate.mockReset();
});

test('131047: «أرسل قالبًا» closes the sheet and opens the templates; no retry', async () => {
  const s = await sheet('131047');
  expect(s.queryByRole('button', { name: t.messages.retry })).toBeNull();
  await fireEvent.press(s.getByRole('button', { name: t.inbox.composer.sendTemplate }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onTemplate).toHaveBeenCalledTimes(1);
});

test('another failure offers no template button', async () => {
  const s = await sheet('131026');
  expect(s.queryByRole('button', { name: t.inbox.composer.sendTemplate })).toBeNull();
});
