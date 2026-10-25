import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { ltr } from '@/core/ui/primitives/Ltr';
import { threadKey } from './thread-cache';
import { cachedThread, delivered, detail, inbound, message, PHONE, thread } from './thread-fixtures';
import { ThreadScreen } from './ThreadScreen';
import { ticksLabel } from './ticks.helpers';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => false, replace: (h: string) => mockReplace(h) },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const word = t.enums.messageStatus;
const threadCalls = () => mockApiFetch.mock.calls.filter(([p]) => String(p).startsWith('/threads'));

beforeEach(() => {
  mockApiFetch.mockReset();
  mockReplace.mockReset();
});

test('the thread: who it is, their messages and ours with its delivery ticks', async () => {
  mockApiFetch.mockResolvedValue(detail([inbound, delivered]));
  await renderWithQuery(<ThreadScreen />);
  expect(await screen.findByText(inbound.body ?? '')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/threads/%2B966552147730');
  expect(screen.getByRole('header', { name: 'هدى سالم' })).toBeTruthy();
  expect(screen.getByText(`${t.inbox.kind.lead} · ${ltr('+966 55 214 7730')}`)).toBeTruthy();
  expect(screen.getByText(delivered.body ?? '')).toBeTruthy();
  expect(screen.getByLabelText(ticksLabel(word.delivered))).toBeTruthy();
  // Their message carries no ticks: only ours do.
  expect(screen.getAllByLabelText(new RegExp(`^(${Object.values(word).join('|')})`))).toHaveLength(1);
});

test('a number with no name or messages yet: titled by its phone, empty, the first template only', async () => {
  mockApiFetch.mockResolvedValue({ thread: null, messages: [], has_more: false });
  await renderWithQuery(<ThreadScreen />);
  expect(await screen.findByText(t.inbox.empty)).toBeTruthy();
  expect(screen.getByRole('header', { name: ltr('+966 55 214 7730') })).toBeTruthy();
  expect(screen.getByText(t.inbox.unknownNumber)).toBeTruthy();
  expect(screen.getByText(t.inbox.newChat.firstTemplate)).toBeTruthy(); // the first message is a template (not «24 h ago»)
});

test('media: the kind as a link once the file is there; unsupported says so', async () => {
  const photo = message({ id: 'p', direction: 'inbound', media_mime: 'image/jpeg', media_url: 'https://x/p' });
  const odd = message({ id: 'o', direction: 'inbound', body: null });
  const gone = message({
    id: 'g',
    direction: 'inbound',
    body: null,
    interactive_payload: { type: 'unsupported', errors: [{ code: 131060 }], unsupported: { type: 'unknown' } },
  });
  mockApiFetch.mockResolvedValue(detail([photo, odd, gone]));
  await renderWithQuery(<ThreadScreen />);
  expect(await screen.findByRole('link', { name: t.inbox.media.image })).toBeTruthy();
  expect(screen.getByText(t.inbox.media.other)).toBeTruthy();
  expect(screen.getByText(t.inbox.unavailable)).toBeTruthy();
});

test('a guardian’s «تمام» says what it did: the lesson it confirmed, or that none was', async () => {
  const yes = message({
    id: 'c',
    direction: 'inbound',
    body: 'تمام',
    guardian_id: 'g-1',
    lesson: { starts_at: '2026-10-04T14:00:00Z', status: 'confirmed' },
  });
  const nothing = message({ id: 'n', direction: 'inbound', body: 'نعم', guardian_id: 'g-1' });
  mockApiFetch.mockResolvedValue(detail([yes, nothing]));
  await renderWithQuery(<ThreadScreen />);
  expect(await screen.findByText(t.inbox.quickReply.confirmed.replace('{when}', 'الأحد 4 أكتوبر 17:00'))).toBeTruthy();
  expect(screen.getByText(t.inbox.quickReply.notConfirmed)).toBeTruthy();
});

test('offline: the saved thread stays, with when it was fetched', async () => {
  mockApiFetch.mockRejectedValue(new Error('offline'));
  const client = createTestQueryClient();
  client.setQueryData(threadKey(PHONE), cachedThread(detail([inbound])));
  await renderWithQuery(<ThreadScreen />, client);
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
  expect(screen.getByText(inbound.body ?? '')).toBeTruthy();
  expect(await screen.findByText(new RegExp(t.mobile.lastUpdated.replace(' {time}', '')))).toBeTruthy();
});

test('nothing saved and no answer: the error with retry, nothing invented', async () => {
  mockApiFetch.mockRejectedValue(new Error('offline'));
  await renderWithQuery(<ThreadScreen />);
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  expect(screen.queryByLabelText(t.inbox.composer.placeholder)).toBeNull();
});

test('pull to refresh asks the API again', async () => {
  mockApiFetch.mockResolvedValue(detail([inbound]));
  const { container } = await renderWithQuery(<ThreadScreen />);
  await screen.findByText(inbound.body ?? '');
  const [list] = container.queryAll((node) => typeof node.props['onRefresh'] === 'function');
  if (!list) throw new Error('no pull-to-refresh on the list');
  await fireEvent(list, 'refresh');
  await waitFor(() => expect(threadCalls()).toHaveLength(2));
});

test('«رسائل أقدم» pages back from the oldest loaded message', async () => {
  const older = message({ id: 'm0', direction: 'inbound', body: 'رسالة قديمة', created_at: '2026-09-29T10:00:00Z' });
  const pages = [detail([inbound, delivered], { has_more: true }), detail([older])];
  mockApiFetch.mockImplementation(async (path: string) =>
    path.startsWith('/threads') ? pages.shift() : { open: true, reason: null, queued: 0 },
  );
  await renderWithQuery(<ThreadScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.inbox.loadOlder }));
  expect(await screen.findByText('رسالة قديمة')).toBeTruthy();
  // The last thread fetch (a new bubble may re-read /auth/me for messages.manage after it).
  const threadCalls = mockApiFetch.mock.calls.filter(([p]) => String(p).startsWith('/threads'));
  expect(threadCalls.at(-1)).toEqual([`/threads/%2B966552147730?before=${encodeURIComponent(inbound.created_at)}`]);
  expect(screen.queryByRole('button', { name: t.inbox.loadOlder })).toBeNull();
});

test('«رجوع» from a push-opened thread lands on the inbox', async () => {
  mockApiFetch.mockResolvedValue(detail([inbound], { thread: { ...thread, display_name: null } }));
  await renderWithQuery(<ThreadScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.common.back }));
  expect(mockReplace).toHaveBeenCalledWith('/inbox');
});
