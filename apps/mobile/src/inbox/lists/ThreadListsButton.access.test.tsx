import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { detail, inbound } from '../shared/thread-fixtures';
import { ThreadModeProvider } from '../thread/hooks/thread-mode';
import { ThreadScreen } from '../screens/ThreadScreen';
import { answer, withLists, withoutLists } from './list-fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true, push: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const listsButton = () => screen.queryByRole('button', { name: t.inbox.lists.title });

beforeEach(() => mockApiFetch.mockReset());

test('with inbox.lists the chat header has «القوائم»', async () => {
  mockApiFetch.mockImplementation(answer({ me: withLists, threads: () => detail([inbound]) }));
  await renderWithQuery(<ThreadScreen />, createTestQueryClient({ meFromApi: true }));
  expect(await screen.findByRole('button', { name: t.inbox.lists.title })).toBeTruthy();
});

test('without inbox.lists: no «القوائم»', async () => {
  mockApiFetch.mockImplementation(answer({ me: withoutLists, threads: () => detail([inbound]) }));
  await renderWithQuery(<ThreadScreen />, createTestQueryClient({ meFromApi: true }));
  await screen.findByText(inbound.body ?? '');
  expect(listsButton()).toBeNull();
});

test('teacher mode is unchanged: no «القوائم» even for a role holding inbox.lists', async () => {
  mockApiFetch.mockImplementation(answer({ me: withLists, threads: () => detail([inbound]) }));
  await renderWithQuery(
    <ThreadModeProvider value={{ kind: 'teacher', teacherId: 't-abrar' }}>
      <ThreadScreen />
    </ThreadModeProvider>,
  );
  await screen.findByText(inbound.body ?? '');
  expect(listsButton()).toBeNull();
  expect(mockApiFetch).not.toHaveBeenCalledWith('/chat-lists');
});
