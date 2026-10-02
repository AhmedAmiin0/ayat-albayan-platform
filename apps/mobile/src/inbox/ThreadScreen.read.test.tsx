import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { ltr } from '@/ui/Ltr';
import { threadKey } from './thread-cache';
import { cachedThread, delivered, detail, inbound, message, PHONE, thread } from './thread-fixtures';
import { ThreadScreen } from './ThreadScreen';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => false, replace: (h: string) => mockReplace(h) },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const word = t.enums.messageStatus;
const threadCalls = () => mockApiFetch.mock.calls.filter(([p]) => String(p).startsWith('/threads'));

beforeEach(() => {
  mockApiFetch.mockReset();
  mockReplace.mockReset();
});

test('the thread: who it is, their messages and ours with the status word', async () => {
  mockApiFetch.mockResolvedValue(detail([inbound, delivered]));
  await renderWithQuery(<ThreadScreen />);
  expect(await screen.findByText(inbound.body ?? '')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/threads/%2B966552147730');
  expect(screen.getByRole('header', { name: 'هدى سالم' })).toBeTruthy();
  expect(screen.getByText(`${t.inbox.kind.lead} · ${ltr('+966 55 214 7730')}`)).toBeTruthy();
  expect(screen.getByText(delivered.body ?? '')).toBeTruthy();
  expect(screen.getByText(word.delivered)).toBeTruthy();
  // Their message carries no status chip: only ours do.
  expect(screen.getAllByText(new RegExp(Object.values(word).join('|')))).toHaveLength(1);
});

test('a number with no name or messages yet: titled by its phone, empty, template only', async () => {
  mockApiFetch.mockResolvedValue({ thread: null, messages: [], has_more: false });
  await renderWithQuery(<ThreadScreen />);
  expect(await screen.findByText(t.inbox.empty)).toBeTruthy();
  expect(screen.getByRole('header', { name: ltr('+966 55 214 7730') })).toBeTruthy();
  expect(screen.getByText(t.inbox.unknownNumber)).toBeTruthy();
  expect(screen.getByText(t.inbox.sessionClosed)).toBeTruthy();
});

test('media: the kind as a link once the file is there; unsupported says so', async () => {
  const photo = message({ id: 'p', direction: 'inbound', media_mime: 'image/jpeg', media_url: 'https://x/p' });
  const odd = message({ id: 'o', direction: 'inbound', body: null });
  mockApiFetch.mockResolvedValue(detail([photo, odd]));
  await renderWithQuery(<ThreadScreen />);
  expect(await screen.findByRole('link', { name: t.inbox.media.image })).toBeTruthy();
  expect(screen.getByText(t.inbox.media.other)).toBeTruthy();
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

test('«رسايل أقدم» pages back from the oldest loaded message', async () => {
  const older = message({ id: 'm0', direction: 'inbound', body: 'رسالة قديمة', created_at: '2026-09-29T10:00:00Z' });
  mockApiFetch
    .mockResolvedValueOnce(detail([inbound, delivered], { has_more: true }))
    .mockResolvedValueOnce(detail([older]));
  await renderWithQuery(<ThreadScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.inbox.loadOlder }));
  expect(await screen.findByText('رسالة قديمة')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenLastCalledWith(
    `/threads/%2B966552147730?before=${encodeURIComponent(inbound.created_at)}`,
  );
  expect(screen.queryByRole('button', { name: t.inbox.loadOlder })).toBeNull();
});

test('«رجوع» from a push-opened thread lands on the inbox', async () => {
  mockApiFetch.mockResolvedValue(detail([inbound], { thread: { ...thread, display_name: null } }));
  await renderWithQuery(<ThreadScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.common.back }));
  expect(mockReplace).toHaveBeenCalledWith('/inbox');
});
