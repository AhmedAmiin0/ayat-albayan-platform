import { cleanup, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { detail, inbound, thread } from '../shared/thread-fixtures';
import { InboxScreen } from '../screens/InboxScreen';
import { ThreadScreen } from '../screens/ThreadScreen';
import { forgetReopens } from './use-thread-reopen';

// «إعادة فتح المحادثة» (owner 2026-10-26): opening a closed chat asks once per thread per app session;
// the list never does. Fakes only.

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true, push: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const REOPEN = '/threads/%2B966552147730/reopen';
const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const CLOSED = { ...thread, last_inbound_at: minutesAgo(3 * 24 * 60) };
const OPEN = { ...thread, last_inbound_at: minutesAgo(5) };
const reopens = () => mockApiSend.mock.calls.filter((c) => c[1] === REOPEN).length;

async function open(th: typeof thread) {
  mockApiFetch.mockImplementation(async (p: string) => (p === '/messages/gate' ? { open: true, reason: null, queued: 0 } : detail([inbound], { thread: th })));
  await renderWithQuery(<ThreadScreen />, createTestQueryClient());
  await screen.findByText(inbound.body ?? '');
}

beforeEach(() => {
  forgetReopens();
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
});

test('a closed chat: one request and the note; opened again this session: no new request', async () => {
  mockApiSend.mockResolvedValue({ kapso_reopened: true, template: 'template_queued' });
  await open(CLOSED);
  expect((await screen.findByTestId('reopen-note')).props.children).toBe(t.inbox.reopen.requested);
  expect(mockApiSend).toHaveBeenCalledWith('POST', REOPEN);
  await cleanup();
  await open(CLOSED);
  expect((await screen.findByTestId('reopen-note')).props.children).toBe(t.inbox.reopen.requested);
  expect(reopens()).toBe(1);
});

test('already requested today: says so; a restricted role: no note', async () => {
  mockApiSend.mockResolvedValue({ kapso_reopened: false, template: 'already_requested_today' });
  await open(CLOSED);
  expect((await screen.findByTestId('reopen-note')).props.children).toBe(t.inbox.reopen.requestedToday);
  await cleanup();
  forgetReopens();
  mockApiSend.mockResolvedValue({ kapso_reopened: true, template: 'not_allowed' });
  await open(CLOSED);
  await waitFor(() => expect(reopens()).toBe(2));
  expect(screen.queryByTestId('reopen-note')).toBeNull();
});

test('the reopen template not approved yet: reopened, template not available yet', async () => {
  mockApiSend.mockResolvedValue({ kapso_reopened: true, template: 'template_unavailable' });
  await open(CLOSED);
  expect((await screen.findByTestId('reopen-note')).props.children).toBe(t.inbox.reopen.unavailable);
});

test('not sent, or the request failed: says so, send it by hand (owner 2026-10-27: never silent)', async () => {
  mockApiSend.mockResolvedValue({ kapso_reopened: false, template: 'not_sent' });
  await open(CLOSED);
  expect((await screen.findByTestId('reopen-note')).props.children).toBe(t.inbox.reopen.failed);
  await cleanup();
  forgetReopens();
  mockApiSend.mockRejectedValue(new Error('HTTP 500'));
  await open(CLOSED);
  expect((await screen.findByTestId('reopen-note')).props.children).toBe(t.inbox.reopen.failed);
});

test('the window open on the server (a reply just came): no note', async () => {
  mockApiSend.mockResolvedValue({ kapso_reopened: false, template: 'window_open' });
  await open(CLOSED);
  await waitFor(() => expect(reopens()).toBe(1));
  expect(screen.queryByTestId('reopen-note')).toBeNull();
});

test('an open window asks nothing', async () => {
  await open(OPEN);
  expect(reopens()).toBe(0);
});

test('the list of closed chats never asks', async () => {
  mockApiFetch.mockResolvedValue({ items: [CLOSED, { ...CLOSED, phone_e164: '+966552147731', display_name: 'أم يوسف' }], total: 2, page: 1, pageSize: 25 });
  await renderWithQuery(<InboxScreen />);
  await screen.findByText('أم يوسف');
  expect(mockApiSend).not.toHaveBeenCalled();
});
