import { fireEvent, screen, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { answer, withLists, withoutLists } from '../../lists/list-fixtures';
import { ThreadScreen } from '../../screens/ThreadScreen';
import { detail, inbound, PHONE } from '../../shared/thread-fixtures';
import { ThreadModeProvider } from '../hooks/thread-mode';

// Review 2026-10-29 #13 / C5: the call and ONE «⋮» in the header, so the name gets the width.
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

const header = () => within(screen.getByTestId('chat-header'));
const menu = () => within(screen.getByTestId('thread-menu'));
const words = (): unknown[] => menu().getAllByRole('button').map((b) => within(b).getByText(/./).props.children);

async function open(me: unknown) {
  mockApiFetch.mockImplementation(answer({ me, threads: () => detail([inbound]) }));
  await renderWithQuery(<ThreadScreen />, createTestQueryClient({ meFromApi: true }));
  await screen.findByText(inbound.body ?? '');
}

beforeEach(() => mockApiFetch.mockReset());

test('the header holds back, the call and «⋮» only; the menu lists «نسخ الرقم», «القوائم», then «إلغاء»', async () => {
  await open(withLists);
  expect(header().getByRole('button', { name: t.inbox.chatMenu })).toBeTruthy();
  expect(header().queryByRole('button', { name: t.inbox.copy.phone })).toBeNull();
  expect(header().queryByRole('button', { name: t.inbox.lists.title })).toBeNull();
  expect(screen.queryByTestId('thread-menu')).toBeNull();
  await fireEvent.press(header().getByRole('button', { name: t.inbox.chatMenu }));
  expect(words()).toEqual([t.inbox.copy.phone, t.inbox.lists.title, t.common.cancel]);
});

test('«نسخ الرقم» closes the menu, then shows the number in E.164 on the selectable copy sheet', async () => {
  await open(withLists);
  await fireEvent.press(header().getByRole('button', { name: t.inbox.chatMenu }));
  await fireEvent.press(menu().getByRole('button', { name: t.inbox.copy.phone }));
  expect(screen.queryByTestId('thread-menu')).toBeNull();
  expect(await screen.findByText(t.inbox.copy.phoneTitle)).toBeTruthy();
  const text = screen.getByTestId('copy-text');
  expect([text.props.selectable, text.props.children]).toEqual([true, PHONE]);
});

test('«إلغاء» closes the menu; without inbox.lists it has no «القوائم»', async () => {
  await open(withoutLists);
  await fireEvent.press(header().getByRole('button', { name: t.inbox.chatMenu }));
  expect(words()).toEqual([t.inbox.copy.phone, t.common.cancel]);
  await fireEvent.press(menu().getByRole('button', { name: t.common.cancel }));
  expect(screen.queryByTestId('thread-menu')).toBeNull();
  expect(mockApiFetch).not.toHaveBeenCalledWith('/chat-lists');
});

test('teacher mode is unchanged: no «⋮», even for a role holding inbox.lists', async () => {
  mockApiFetch.mockImplementation(answer({ me: withLists, threads: () => detail([inbound]) }));
  await renderWithQuery(
    <ThreadModeProvider value={{ kind: 'teacher', teacherId: 't-abrar' }}>
      <ThreadScreen />
    </ThreadModeProvider>,
  );
  await screen.findByText(inbound.body ?? '');
  expect(screen.queryByRole('button', { name: t.inbox.chatMenu })).toBeNull();
  expect(screen.queryByRole('button', { name: t.inbox.lists.title })).toBeNull();
});
