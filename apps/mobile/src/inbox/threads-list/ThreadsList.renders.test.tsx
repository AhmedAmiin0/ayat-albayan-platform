import type { ThreadView } from '@ab/shared';
import { act, screen } from '@testing-library/react-native';
import { renderWithQuery } from '@/test/query';
import { thread } from '../shared/thread-fixtures';
import { ThreadModeProvider } from '../thread/hooks/thread-mode';
import { ThreadsList } from './ThreadsList';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
// Counts each row's draws by its title (ThreadRow → ListRow), then draws the real row.
const mockDraws = new Map<string, number>();
jest.mock('@/core/ui/layout/ListRow', () => {
  const actual = jest.requireActual('@/core/ui/layout/ListRow');
  return {
    ListRow: (props: { title: string }) => {
      mockDraws.set(props.title, (mockDraws.get(props.title) ?? 0) + 1);
      return actual.ListRow(props);
    },
  };
});

const chat = (n: number, extra: Partial<ThreadView> = {}): ThreadView => ({
  ...thread,
  phone_e164: `+96655000000${n}`,
  display_name: `محادثة ${n}`,
  last_body: `رسالة ${n}`,
  ...extra,
});
const page = (items: ThreadView[]) => ({ items, total: items.length, page: 1, pageSize: 25 });

test('a poll that changes one chat redraws only that chat\'s row (owner: «Avoid rerenders»)', async () => {
  mockApiFetch.mockResolvedValue(page([chat(1), chat(2), chat(3)]));
  const { client } = await renderWithQuery(
    <ThreadModeProvider value={{ kind: 'admin' }}>
      <ThreadsList />
    </ThreadModeProvider>,
  );
  await screen.findByText('محادثة 3');
  const before = new Map(mockDraws);
  // The next poll: chat 2 got a new message; the others come back equal (new JSON objects).
  mockApiFetch.mockResolvedValue(page([chat(1), chat(2, { last_body: 'وصلت الآن', unread_count: 1 }), chat(3)]));
  await act(async () => client.invalidateQueries({ queryKey: ['threads'] }));
  await screen.findByText(/وصلت الآن/);
  const drawn = (title: string) => (mockDraws.get(title) ?? 0) - (before.get(title) ?? 0);
  expect(drawn('محادثة 2')).toBeGreaterThan(0);
  expect(drawn('محادثة 1')).toBe(0);
  expect(drawn('محادثة 3')).toBe(0);
});
