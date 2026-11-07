import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { detail, inbound, thread } from '@/inbox/shared/thread-fixtures';
import { InboxScreen } from '@/inbox/screens/InboxScreen';
import { ThreadScreen } from '@/inbox/screens/ThreadScreen';

// Owner 2026-11-07 (option 1): opening a chat whose 24 h window is closed sends NOTHING (an admin
// opened one at night and the family got the welcome template). The starter goes on send only.
// Fakes only.

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

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const CLOSED = { ...thread, last_inbound_at: minutesAgo(3 * 24 * 60), session_open: false };
const GATE = { open: true, reason: null, queued: 0 };

async function open(th: typeof thread) {
  mockApiFetch.mockImplementation(async (p: string) => (p === '/messages/gate' ? GATE : detail([inbound], { thread: th })));
  await renderWithQuery(<ThreadScreen />, createTestQueryClient());
  await screen.findByText(inbound.body ?? '');
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
});

test('a closed Kapso chat: no request on open; the note says the welcome goes first on send', async () => {
  await open({ ...CLOSED, try_after_window: true });
  expect(screen.getByText(t.inbox.tryAfterWindow)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
  expect(mockApiFetch.mock.calls.some((c) => String(c[0]).includes('/reopen'))).toBe(false);
});

test('a closed chat with templates only: no request either', async () => {
  await open(CLOSED);
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('the list of closed chats never asks', async () => {
  mockApiFetch.mockResolvedValue({ items: [CLOSED, { ...CLOSED, phone_e164: '+966552147731', display_name: 'أم يوسف' }], total: 2, page: 1, pageSize: 25 });
  await renderWithQuery(<InboxScreen />);
  await screen.findByText('أم يوسف');
  expect(mockApiSend).not.toHaveBeenCalled();
});
