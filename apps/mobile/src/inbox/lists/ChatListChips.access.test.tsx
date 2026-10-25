import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { renderWithQuery } from '@/test/query';
import { thread } from '../thread-fixtures';
import { ThreadModeProvider } from '../thread/hooks/thread-mode';
import { ThreadsList } from '../ThreadsList';
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

test('without inbox.lists: no chip row and the lists are never fetched', async () => {
  mockApiFetch.mockImplementation(answer({ me: withoutLists }));
  await renderWithQuery(<ThreadsList />);
  expect(await screen.findByText(NAME)).toBeTruthy();
  expect(screen.queryByLabelText(t.inbox.lists.rowLabel)).toBeNull();
  expect(screen.queryByText(`＋ ${t.inbox.lists.new}`)).toBeNull();
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
  expect(screen.queryByLabelText(t.inbox.lists.rowLabel)).toBeNull();
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
  expect(screen.getByLabelText(t.inbox.lists.rowLabel)).toBeTruthy();
});
