import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { thread } from '../shared/thread-fixtures';
import { ThreadsList } from '../threads-list/ThreadsList';
import { answer, page, PAID, TRIAL, withLists } from './list-fixtures';
import { listsKey } from './use-chat-lists';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const NAME = thread.display_name ?? '';
const threadCalls = () => mockApiFetch.mock.calls.map(([p]: [string]) => p).filter((p) => p.startsWith('/threads'));

async function row() {
  return within(await screen.findByLabelText(t.inbox.filterRow));
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockImplementation(answer({ me: withLists, threads: (p) => (p.includes('list=') ? page([]) : page()) }));
});

test('ONE row: «الكل» selected, «غير مقروءة», «بانتظار ردّك», the stages, the lists oldest first, then «＋»', async () => {
  await renderWithQuery(<ThreadsList />);
  const chips = await row();
  await chips.findByRole('tab', { name: PAID.name });
  const tabs = chips.getAllByRole('tab');
  expect(tabs.map((c) => c.props.accessibilityState)).toEqual([{ selected: true }, ...Array(10).fill({ selected: false })]);
  const words: unknown[] = tabs.map((c) => within(c).getByText(/./).props.children);
  expect(words.slice(2, 4)).toEqual([t.inbox.filterWaiting, t.enums.leadStatus.new]);
  expect(words.slice(9)).toEqual([PAID.name, TRIAL.name]);
  expect(chips.getByRole('tab', { name: t.inbox.filterAll, selected: true })).toBeTruthy();
  expect(chips.getByRole('tab', { name: t.inbox.filterUnread, selected: false })).toBeTruthy();
  expect(chips.getByRole('tab', { name: TRIAL.name, selected: false })).toBeTruthy();
  expect(chips.getByRole('button', { name: t.inbox.lists.new })).toBeTruthy();
  expect(chips.getByText('＋')).toBeTruthy();
  expect(screen.getAllByLabelText(t.inbox.filterRow)).toHaveLength(1);
  expect(screen.queryByLabelText(t.inbox.title)).toBeNull();
  expect(await screen.findByText(NAME)).toBeTruthy();
});

test('a list chip filters the chats by list=<id>; an empty list says how to add chats', async () => {
  await renderWithQuery(<ThreadsList />);
  await fireEvent.press(await (await row()).findByRole('tab', { name: PAID.name }));
  expect(await screen.findByText(t.inbox.lists.empty)).toBeTruthy();
  expect(threadCalls()).toContain(`/threads?list=${PAID.id}&page=1&pageSize=25`);
  expect((await row()).getByRole('tab', { name: PAID.name, selected: true })).toBeTruthy();
  expect(screen.queryByText(NAME)).toBeNull();
  await fireEvent.press((await row()).getByRole('tab', { name: t.inbox.filterAll }));
  expect(await screen.findByText(NAME)).toBeTruthy();
});

test('an active list that is gone (deleted elsewhere) falls back to «الكل»', async () => {
  const { client } = await renderWithQuery(<ThreadsList />);
  await fireEvent.press(await (await row()).findByRole('tab', { name: PAID.name }));
  await screen.findByText(t.inbox.lists.empty);
  client.setQueryData(listsKey, [TRIAL]);
  await waitFor(() => expect(screen.queryByRole('tab', { name: PAID.name })).toBeNull());
  expect(await screen.findByText(NAME)).toBeTruthy();
  expect((await row()).getByRole('tab', { name: t.inbox.filterAll, selected: true })).toBeTruthy();
  expect(threadCalls().at(-1)).toBe('/threads?page=1&pageSize=25');
});

test('the lists failing to load stay quiet: the chats still show, with a small note', async () => {
  mockApiFetch.mockImplementation(async (p: string) => {
    if (p === '/chat-lists') throw new Error('offline');
    return answer({ me: withLists })(p);
  });
  await renderWithQuery(<ThreadsList />);
  expect(await screen.findByText(t.inbox.lists.loadError)).toBeTruthy();
  expect(await screen.findByText(NAME)).toBeTruthy();
  expect((await row()).getByRole('tab', { name: t.inbox.filterAll, selected: true })).toBeTruthy();
});
