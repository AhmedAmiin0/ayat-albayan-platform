import { act, screen } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { thread } from '@/inbox/shared/thread-fixtures';
import { ThreadModeProvider } from '@/inbox/thread/hooks/thread-mode';
import { ThreadsList } from './ThreadsList';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

// 23:58 on the device; both chats' last message is from 23:00 that day.
const AT = new Date(2026, 9, 26, 23, 0).toISOString();
const chat = (n: number) => ({ ...thread, phone_e164: `+96655000000${n}`, display_name: `محادثة ${n}`, last_message_at: AT });

// Every AppState listener (the list's clock among them), called on «back to the foreground».
const listeners: ((s: AppStateStatus) => void)[] = [];
beforeEach(() => {
  listeners.length = 0;
  fakeNow(new Date(2026, 9, 26, 23, 58));
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    listeners.push(handler);
    return { remove: jest.fn() };
  });
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('compiled: one clock for the list; «23:00» turns into «أمس» after midnight (foreground), no remount', async () => {
  const timers = jest.spyOn(globalThis, 'setInterval');
  mockApiFetch.mockResolvedValue({ items: [chat(1), chat(2)], total: 2, page: 1, pageSize: 25 });
  await renderWithQuery(
    <ThreadModeProvider value={{ kind: 'admin' }}>
      <ThreadsList />
    </ThreadModeProvider>,
  );
  await screen.findByText('محادثة 2');
  const times = () => screen.getAllByTestId('thread-time').map((el) => el.props.children);
  expect(times()).toEqual(['23:00', '23:00']);
  expect(timers.mock.calls.filter((c) => c[1] === 60_000)).toHaveLength(1);
  // Back to the foreground at 00:03: the list's one clock (useToday) moves to the new day.
  jest.setSystemTime(new Date(2026, 9, 27, 0, 3));
  await act(async () => listeners.forEach((on) => on('active')));
  expect(times()).toEqual([t.inbox.dayYesterday, t.inbox.dayYesterday]);
});
