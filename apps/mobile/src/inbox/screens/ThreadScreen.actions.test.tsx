import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { delivered, detail, failed, inbound, message } from '../shared/thread-fixtures';
import { ThreadScreen } from './ThreadScreen';
import { ticksLabel } from '../shared/ticks.helpers';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
// The actions need messages.manage (the admin's): /auth/me grants it, every other GET is the thread.
const mockAdminMe = { role: 'admin', permissions: ['inbox.read', 'inbox.send', 'messages.read', 'messages.manage'] };
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => (mockPath === '/auth/me' ? Promise.resolve(mockAdminMe) : mockApiFetch(mockPath)),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const word = t.enums.messageStatus;
/** A queued row the API gave a wa.me link: its clock is a button that says what it offers. */
const parkedClock = `${word.queued} — ${t.messages.clickToChat}`;

async function open(rows = [inbound, delivered, failed]) {
  mockApiFetch.mockResolvedValue(detail(rows));
  await renderWithQuery(<ThreadScreen />, createTestQueryClient({ meFromApi: true }));
  await screen.findByText(inbound.body ?? '');
}

/** As WhatsApp: a tap on «! لم تُرسل» (or a held row's clock) opens the one sheet; nothing sits in the bubble. */
async function sheetOf(testID = 'ticks-failed') {
  await fireEvent.press(await screen.findByTestId(testID));
  return within(screen.getByTestId('failed-sheet'));
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
  jest.restoreAllMocks();
});

test('a failed reminder: template name, «لم تُرسل», why in words, and no buttons in the bubble', async () => {
  await open();
  expect(screen.getByText(t.inbox.templateLine.replace('{name}', t.templates.names.lesson_reminder_plain))).toBeTruthy();
  expect(screen.getByText(word.failed)).toBeTruthy();
  const why = t.messages.errorLine.replace('{reason}', t.messages.errors['131049']);
  expect(screen.queryByRole('button', { name: t.messages.retry })).toBeNull();
  expect(screen.queryByRole('button', { name: t.messages.clickToChat })).toBeNull();
  // The reason is a way into the same sheet, a wider target than the «!».
  await fireEvent.press(screen.getByRole('button', { name: why }));
  expect(within(screen.getByTestId('failed-sheet')).getByRole('button', { name: t.messages.retry })).toBeTruthy();
});

test('no «حاول مرة أخرى» where it cannot help (not on WhatsApp): the sheet offers sending it by hand', async () => {
  await open([inbound, { ...failed, error_code: '131026' }]);
  const sheet = await sheetOf();
  expect(sheet.getByText(t.messages.errorLine.replace('{reason}', t.messages.errors['131026']))).toBeTruthy();
  expect(sheet.queryByRole('button', { name: t.messages.retry })).toBeNull();
  expect(sheet.getByRole('button', { name: t.messages.clickToChat })).toBeTruthy();
});

test('«حاول مرة أخرى» puts it back in the queue and the row says so', async () => {
  const retried = { ...failed, status: 'queued' as const, error_code: null, attempts: 0 };
  mockApiSend.mockResolvedValue(retried);
  await open();
  mockApiFetch.mockResolvedValue(detail([inbound, delivered, retried]));
  await fireEvent.press((await sheetOf()).getByRole('button', { name: t.messages.retry }));
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/messages/m3/retry');
  expect(await screen.findByRole('button', { name: parkedClock })).toBeTruthy();
  expect(screen.queryByText(word.failed)).toBeNull();
});

test('a refused retry says so in the chat’s notice and leaves the row as it was', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'not_retryable' }));
  await open();
  await fireEvent.press((await sheetOf()).getByRole('button', { name: t.messages.retry }));
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  expect(screen.getByText(word.failed)).toBeTruthy();
});

test('«أرسلها بنفسك» tells the server first (it holds the row), then opens the API wa.me link', async () => {
  const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  const held = { ...failed, error_code: 'handed_off' };
  mockApiSend.mockResolvedValue(held);
  await open();
  mockApiFetch.mockResolvedValue(detail([inbound, delivered, held]));
  await fireEvent.press((await sheetOf()).getByRole('button', { name: t.messages.clickToChat }));
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/messages/m3/hand-off');
  await waitFor(() => expect(openUrl).toHaveBeenCalledWith(failed.click_to_chat));
  expect(mockApiSend.mock.invocationCallOrder[0]).toBeLessThan(openUrl.mock.invocationCallOrder[0] ?? 0);
  expect(await screen.findByText(t.messages.handedOff)).toBeTruthy();
});

test('the sender claimed it meanwhile (409 not_manual): no WhatsApp, it says the message is going out', async () => {
  const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  openUrl.mockClear(); // Linking's mock keeps one spy across tests
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'not_manual' }));
  await open();
  await fireEvent.press((await sheetOf()).getByRole('button', { name: t.messages.clickToChat }));
  expect(await screen.findByText(t.messages.alreadySending)).toBeTruthy();
  expect(openUrl).not.toHaveBeenCalled();
});

test('a held row asks from its own state: «أرسلتها بنفسي» records it, «أعدها» puts it back', async () => {
  const held = { ...failed, error_code: 'handed_off' };
  const manual = { ...failed, status: 'sent_manually' as const, sent_manually_at: failed.created_at };
  mockApiSend.mockResolvedValue(manual);
  await open([inbound, held]);
  expect(screen.getByText(t.messages.handedOff)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.messages.retry })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.messages.markSentManually }));
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/messages/m3/sent-manually');
  await fireEvent.press(screen.getByRole('button', { name: t.messages.undoHandOff }));
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/messages/m3/retry');
});

test('queued with sending off: a tap on the clock offers sending by hand, no retry; a later one says when it goes', async () => {
  const parked = message({ id: 'q', body: 'تأكيد الحجز', status: 'queued', click_to_chat: 'https://wa.me/966552147730' });
  const later = message({ id: 'l', body: 'تذكير', status: 'queued', scheduled_for: '2099-01-01T10:00:00Z' });
  await open([inbound, parked, later]);
  expect(screen.queryByRole('button', { name: t.messages.clickToChat })).toBeNull();
  // Only the parked row's clock is a button (the later one has no wa.me link): getBy finds exactly one.
  await fireEvent.press(screen.getByRole('button', { name: parkedClock }));
  const sheet = within(screen.getByTestId('failed-sheet'));
  expect(sheet.getByRole('button', { name: t.messages.clickToChat })).toBeTruthy();
  expect(sheet.queryByRole('button', { name: t.messages.retry })).toBeNull();
  expect(screen.getByText(new RegExp(t.messages.queuedFor.replace(' {time}', '')))).toBeTruthy();
});

test('a row the sender is sending right now (no wa.me from the API): no hand-send, no retry', async () => {
  const claimed = message({ id: 'c', body: 'تذكير', status: 'queued', attempts: 1, error_code: 'sending', click_to_chat: null });
  await open([inbound, claimed]);
  const ticks = screen.getByLabelText(ticksLabel(word.queued));
  expect(ticks.props.accessibilityRole).toBe('image');
  expect(screen.queryByRole('button', { name: t.messages.clickToChat })).toBeNull();
  expect(screen.queryByRole('button', { name: t.messages.retry })).toBeNull();
  expect(mockApiSend).not.toHaveBeenCalled();
});
