import type { MessageView } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { failed, PHONE } from '../../shared/thread-fixtures';
import { FailedSheet } from './FailedSheet';

const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: async () => ({}),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const onClose = jest.fn();
const onError = jest.fn();
const why = (code: string) => t.messages.errorLine.replace('{reason}', (t.messages.errors as Record<string, string>)[code] ?? '');

async function sheet(m: MessageView | null) {
  await renderWithQuery(<FailedSheet phone={PHONE} message={m} onClose={onClose} onError={onError} />);
  return within(screen.getByTestId('failed-sheet'));
}

beforeEach(() => {
  mockApiSend.mockReset();
  onClose.mockReset();
  onError.mockReset();
  jest.restoreAllMocks();
});

test('131042 (WhatsApp Business payment): the honest reason, sending it by hand, never a retry that cannot work', async () => {
  const s = await sheet({ ...failed, error_code: '131042' });
  expect(screen.getByTestId('failed-sheet').props.accessibilityLabel).toBe(t.messages.failedMenu);
  expect(s.getByText(why('131042'))).toBeTruthy();
  expect(s.queryByRole('button', { name: t.messages.retry })).toBeNull();
  expect(s.getByRole('button', { name: t.messages.clickToChat })).toBeTruthy();
  await fireEvent.press(s.getByRole('button', { name: t.common.cancel }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('131056 (too many to one number): «حاول مرة أخرى» first, closes, and puts it back in the queue', async () => {
  mockApiSend.mockResolvedValue({ ...failed, status: 'queued', error_code: null });
  const s = await sheet({ ...failed, error_code: '131056' });
  const kind = (b: ReturnType<typeof s.getByRole>) =>
    within(b).queryByText(t.messages.retry) ? 'retry' : within(b).queryByText(t.messages.clickToChat) ? 'hand' : 'cancel';
  expect(s.getAllByRole('button').map(kind)).toEqual(['retry', 'hand', 'cancel']);
  await fireEvent.press(s.getByRole('button', { name: t.messages.retry }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(mockApiSend).toHaveBeenCalledWith('POST', `/messages/${failed.id}/retry`);
});

test('by hand: the server holds the row first, then WhatsApp opens (after the sheet closed)', async () => {
  const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  mockApiSend.mockResolvedValue({ ...failed, error_code: 'handed_off' });
  const s = await sheet(failed);
  await fireEvent.press(s.getByRole('button', { name: t.messages.clickToChat }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(mockApiSend).toHaveBeenCalledWith('POST', `/messages/${failed.id}/hand-off`);
  await waitFor(() => expect(openUrl).toHaveBeenCalledWith(failed.click_to_chat));
});

test('refused: «تُرسل الآن» when the sender claimed it (409 not_manual), else the plain error, in the chat notice', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'not_manual' }));
  const s = await sheet(failed);
  await fireEvent.press(s.getByRole('button', { name: t.messages.clickToChat }));
  await waitFor(() => expect(onError).toHaveBeenCalledWith(t.messages.alreadySending));
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'not_retryable' }));
  await fireEvent.press(s.getByRole('button', { name: t.messages.retry }));
  await waitFor(() => expect(onError).toHaveBeenLastCalledWith(t.common.error));
});

test('a queued row with a wa.me link: no reason line, only sending it by hand; null draws nothing', async () => {
  const s = await sheet({ ...failed, status: 'queued', error_code: null });
  expect(s.queryByText(new RegExp(t.messages.errorLine.replace(' {reason}', '')))).toBeNull();
  expect(s.queryByRole('button', { name: t.messages.retry })).toBeNull();
  expect(s.getByRole('button', { name: t.messages.clickToChat })).toBeTruthy();
  await renderWithQuery(<FailedSheet phone={PHONE} message={null} onClose={onClose} onError={onError} />);
  expect(screen.queryByTestId('failed-sheet')).toBeNull();
});
