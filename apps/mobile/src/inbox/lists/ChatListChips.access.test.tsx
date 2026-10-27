import { screen, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { thread } from '../shared/thread-fixtures';
import { ThreadModeProvider } from '../thread/hooks/thread-mode';
import { ThreadsList } from '../threads-list/ThreadsList';
import { answer, PAID, withLists, withoutLists } from './list-fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const NAME = thread.display_name ?? '';
const listCalls = () => mockApiFetch.mock.calls.filter(([p]: [string]) => p === '/chat-lists');

beforeEach(() => mockApiFetch.mockReset());

/** The row holds exactly «الكل» and «غير مقروءة». */
function expectAllAndUnreadOnly() {
  const row = within(screen.getByLabelText(t.inbox.filterRow));
  expect(row.getAllByRole('tab')).toHaveLength(2);
  expect(row.getByRole('tab', { name: t.inbox.filterAll, selected: true })).toBeTruthy();
  expect(row.getByRole('tab', { name: t.inbox.filterUnread })).toBeTruthy();
}

test('without inbox.lists: the row is «الكل» · «غير مقروءة» only, no «＋», the lists never fetched', async () => {
  mockApiFetch.mockImplementation(answer({ me: withoutLists }));
  await renderWithQuery(<ThreadsList />, createTestQueryClient({ meFromApi: true }));
  expect(await screen.findByText(NAME)).toBeTruthy();
  expectAllAndUnreadOnly();
  expect(screen.queryByRole('button', { name: t.inbox.lists.new })).toBeNull();
  expect(listCalls()).toHaveLength(0);
});

test('teacher mode is unchanged: no lists even for a role that holds inbox.lists', async () => {
  mockApiFetch.mockImplementation(answer({ me: withLists }));
  await renderWithQuery(
    <ThreadModeProvider value={{ kind: 'teacher', teacherId: 't-abrar' }}>
      <ThreadsList />
    </ThreadModeProvider>,
  );
  expect(await screen.findByText(NAME)).toBeTruthy();
  expectAllAndUnreadOnly();
  expect(screen.queryByRole('button', { name: t.inbox.lists.new })).toBeNull();
  expect(listCalls()).toHaveLength(0);
  expect(mockApiFetch).toHaveBeenCalledWith('/threads?page=1&pageSize=25');
});

test('the assistant tree (/sales/inbox) gets the same row', async () => {
  mockApiFetch.mockImplementation(answer({ me: withLists }));
  await renderWithQuery(
    <TreeBaseProvider value="/sales">
      <ThreadsList />
    </TreeBaseProvider>,
  );
  expect(await screen.findByRole('tab', { name: PAID.name })).toBeTruthy();
  expect(screen.getByLabelText(t.inbox.filterRow)).toBeTruthy();
});
