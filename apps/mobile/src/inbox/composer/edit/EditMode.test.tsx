import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { detail, message, thread } from '@/inbox/shared/thread-fixtures';
import { ThreadScreen } from '@/inbox/screens/ThreadScreen';
import { setComposerText } from '@/inbox/composer/draft-store';

// «تعديل» (owner 2026-11-07): the menu starts edit mode; «أرسل» sends a correction of it.
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const PATH = '/threads/%2B966552147730/text';
const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const ME = { id: 'u1', role: 'sales', permissions: ['inbox.read', 'inbox.send'] };
const own = message({
  id: 'o1',
  status: 'delivered',
  body: 'الحلقة غدًا الساعة 5',
  replyable: true,
  sent_by_id: 'u1',
  created_at: minutesAgo(9),
});
const box = () => screen.getByLabelText(t.inbox.composer.placeholder);
const menuButton = async (name: string) => {
  await fireEvent(await screen.findByTestId('bubble-o1'), 'longPress');
  await fireEvent.press(within(screen.getByTestId('message-menu')).getByRole('button', { name }));
};

async function editOwn() {
  const data = detail([own], { thread: { ...thread, last_inbound_at: minutesAgo(5) } });
  const answers: Record<string, unknown> = {
    '/auth/me': ME,
    '/messages/gate': { open: true, reason: null, queued: 0 },
  };
  mockApiFetch.mockImplementation(async (path: string) => answers[path] ?? data);
  await renderWithQuery(<ThreadScreen />, createTestQueryClient({ meFromApi: true }));
  await act(async () => undefined);
  await menuButton(t.inbox.correction.action);
}

beforeEach(() => {
  jest.clearAllMocks();
  setComposerText('+966552147730', '');
});

test('the box takes the old text under the edit bar and its note', async () => {
  await editOwn();
  expect(box().props.value).toBe(own.body);
  const strip = within(screen.getByTestId('edit-strip'));
  expect(strip.getByText(t.inbox.correction.bar)).toBeTruthy();
  expect(strip.getByText(t.inbox.correction.note)).toBeTruthy();
  expect(screen.queryByTestId('reply-strip')).toBeNull();
});

test('«أرسل» sends correctsId without a reply nor a prefix; its answer ends edit mode', async () => {
  mockApiSend.mockResolvedValue(message({ id: 'c1', body: 'تصحيح: الحلقة بعد غد', corrects_id: 'o1' }));
  await editOwn();
  await fireEvent.changeText(box(), 'الحلقة بعد غد');
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.send }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalled());
  const [method, path, body] = mockApiSend.mock.calls[0] as [string, string, object];
  expect([method, path]).toEqual(['POST', PATH]);
  expect(body).toMatchObject({ text: 'الحلقة بعد غد', correctsId: 'o1' });
  expect(body).not.toHaveProperty('replyToMessageId');
  await waitFor(() => expect(screen.queryByTestId('edit-strip')).toBeNull());
});

test('a refused correction keeps edit mode and says why', async () => {
  mockApiSend.mockRejectedValue(new ApiError(403, { code: 'not_your_message' }));
  await editOwn();
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.send }));
  expect(await screen.findByText(t.inbox.correction.errors.not_your_message)).toBeTruthy();
  expect(screen.getByTestId('edit-strip')).toBeTruthy();
  // The box gets the text back as typed: never the prefix the API adds.
  expect(box().props.value).toBe(own.body);
});

test('✕ ends edit mode and empties the box; «رد» replaces an edit', async () => {
  await editOwn();
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.correction.cancel }));
  expect(screen.queryByTestId('edit-strip')).toBeNull();
  expect(box().props.value).toBe('');
  await menuButton(t.inbox.correction.action);
  await menuButton(t.inbox.reply.action);
  expect(screen.queryByTestId('edit-strip')).toBeNull();
  expect(screen.getByTestId('reply-strip')).toBeTruthy();
});
