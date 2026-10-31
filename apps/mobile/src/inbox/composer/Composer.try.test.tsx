import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { detail, inbound, thread } from '@/inbox/shared/thread-fixtures';
import { ThreadScreen } from '@/inbox/screens/ThreadScreen';

// Owner 2026-10-31: after the 24 h window a Kapso chat line (try_after_window) lets staff type
// a text (no files, no voice); the note says the chat is reopened on send (no template nudge).
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: jest.fn(),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3_600_000).toISOString();
const CLOSED = { ...thread, last_inbound_at: threeDaysAgo, session_open: false };
const GATE = { open: true, reason: null, queued: 0 };

async function open(th: typeof thread) {
  mockApiFetch.mockImplementation(async (p: string) => (p === '/messages/gate' ? GATE : detail([inbound], { thread: th })));
  await renderWithQuery(<ThreadScreen />, createTestQueryClient());
  await screen.findByText(inbound.body ?? '');
}

beforeEach(() => mockApiFetch.mockReset());

test('a Kapso chat line after the window: the reopen note, the box, no paperclip', async () => {
  await open({ ...CLOSED, try_after_window: true });
  expect(screen.getByText(t.inbox.tryAfterWindow)).toBeTruthy();
  expect(screen.getByLabelText(t.inbox.composer.placeholder)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.inbox.composer.attach })).toBeNull();
  expect(screen.queryByTestId('closed-row')).toBeNull();
});

test('a meta chat line after the window: the closed row, as before', async () => {
  await open(CLOSED);
  expect(screen.queryByText(t.inbox.tryAfterWindow)).toBeNull();
  expect(screen.queryByLabelText(t.inbox.composer.placeholder)).toBeNull();
  expect(screen.getByTestId('closed-row')).toBeTruthy();
});
