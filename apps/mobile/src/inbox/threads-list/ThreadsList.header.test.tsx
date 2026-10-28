import { screen, within } from '@testing-library/react-native';
import { I18nManager } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
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

// Owner 2026-10-27 («This topbar takes alot of space»): three short rows, 8pt apart, then the chats.
beforeEach(() => mockApiFetch.mockResolvedValue({ items: [thread], total: 1, page: 1, pageSize: 25 }));

test('RTL: «المحادثات» as a one-line h2 header, a compact pill search, the blocks 8pt apart', async () => {
  expect(I18nManager.isRTL).toBe(true);
  await renderWithQuery(<ThreadsList />);
  await screen.findByText(thread.display_name ?? '');
  const title = screen.getByRole('header', { name: t.nav.chats });
  expect(title).toHaveStyle({ fontSize: 20 });
  expect(title.props.numberOfLines).toBe(1);
  expect(screen.getByLabelText(t.inbox.searchPlaceholder)).toHaveStyle({ minHeight: 44, fontSize: 16 });
  expect(screen.getByTestId('chats-list')).toHaveStyle({ gap: 8 });
  expect(screen.getByRole('button', { name: t.inbox.newChat.title })).toBeTruthy();
});

test('a teacher: «الكل» · «غير مقروءة» only, no list chips, no «＋», no «محادثة جديدة»', async () => {
  await renderWithQuery(
    <ThreadModeProvider value={{ kind: 'teacher', teacherId: 't-abrar' }}>
      <ThreadsList />
    </ThreadModeProvider>,
  );
  await screen.findByText(thread.display_name ?? '');
  const row = within(screen.getByLabelText(t.inbox.filterRow));
  expect(row.getAllByRole('tab').length).toBe(2);
  expect(row.queryByRole('button', { name: t.inbox.lists.new })).toBeNull();
  expect(screen.queryByRole('button', { name: t.inbox.newChat.title })).toBeNull();
});
