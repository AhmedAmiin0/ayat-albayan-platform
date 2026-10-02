import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { delivered, detail, failed, inbound, message } from './thread-fixtures';
import { ThreadScreen } from './ThreadScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const word = t.enums.messageStatus;

async function open(rows = [inbound, delivered, failed]) {
  mockApiFetch.mockResolvedValue(detail(rows));
  await renderWithQuery(<ThreadScreen />);
  await screen.findByText(inbound.body ?? '');
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
  jest.restoreAllMocks();
});

test('a failed reminder: template name, «متبعتتش», and why in Arabic', async () => {
  await open();
  expect(screen.getByText(t.inbox.templateLine.replace('{name}', t.templates.names.lesson_reminder_plain))).toBeTruthy();
  expect(screen.getByText(word.failed)).toBeTruthy();
  expect(screen.getByText(t.messages.errorLine.replace('{reason}', t.messages.errors['131026']))).toBeTruthy();
});

test('«جرّب تاني» puts it back in the queue and the row says so', async () => {
  const retried = { ...failed, status: 'queued' as const, error_code: null, attempts: 0 };
  mockApiSend.mockResolvedValue(retried);
  await open();
  mockApiFetch.mockResolvedValue(detail([inbound, delivered, retried]));
  await fireEvent.press(screen.getByRole('button', { name: t.messages.retry }));
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/messages/m3/retry');
  expect(await screen.findByText(word.queued)).toBeTruthy();
  expect(screen.queryByText(word.failed)).toBeNull();
});

test('a refused retry says so and leaves the row as it was', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'not_retryable' }));
  await open();
  await fireEvent.press(screen.getByRole('button', { name: t.messages.retry }));
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  expect(screen.getByText(word.failed)).toBeTruthy();
});

test('«ابعتها بنفسك» opens the API wa.me link, then «بعتّها بنفسي» records it', async () => {
  const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  const manual = { ...failed, status: 'sent_manually' as const, sent_manually_at: failed.created_at };
  mockApiSend.mockResolvedValue(manual);
  await open();
  mockApiFetch.mockResolvedValue(detail([inbound, delivered, manual]));
  await fireEvent.press(screen.getByRole('button', { name: t.messages.clickToChat }));
  expect(openUrl).toHaveBeenCalledWith(failed.click_to_chat);
  expect(screen.getByText(t.messages.sentManuallyConfirm)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.messages.markSentManually }));
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/messages/m3/sent-manually');
  expect(await screen.findByText(word.sent_manually)).toBeTruthy();
  expect(screen.queryByText(t.messages.sentManuallyConfirm)).toBeNull();
});

test('«إلغاء» on the question records nothing', async () => {
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await open();
  await fireEvent.press(screen.getByRole('button', { name: t.messages.clickToChat }));
  await fireEvent.press(screen.getByRole('button', { name: t.common.cancel }));
  expect(screen.queryByText(t.messages.sentManuallyConfirm)).toBeNull();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('queued with sending off: hand-send offered, no retry; a later one says when it goes', async () => {
  const parked = message({ id: 'q', body: 'تأكيد الحجز', status: 'queued', click_to_chat: 'https://wa.me/966552147730' });
  const later = message({ id: 'l', body: 'تذكير', status: 'queued', scheduled_for: '2099-01-01T10:00:00Z' });
  await open([inbound, parked, later]);
  expect(screen.getByRole('button', { name: t.messages.clickToChat })).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.messages.retry })).toBeNull();
  expect(screen.getByText(new RegExp(t.messages.queuedFor.replace(' {time}', '')))).toBeTruthy();
});
