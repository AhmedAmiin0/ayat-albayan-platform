import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { ThreadsList } from '@/inbox/threads-list/ThreadsList';
import { answer, PAID, withLists } from '@/inbox/lists/lib/list-fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

// One choice in the one row, as WhatsApp (owner 2026-10-27): All = no filter and no list.
const row = () => within(screen.getByLabelText(t.inbox.filterRow));
const lastThreads = () => mockApiFetch.mock.calls.map(([p]: [string]) => p).filter((p) => p.startsWith('/threads')).at(-1);
const selected = (name: string) => row().getByRole('tab', { name }).props.accessibilityState.selected;

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockImplementation(answer({ me: withLists }));
});

test('a list clears «غير مقروءة», «غير مقروءة» clears the list, «الكل» clears both', async () => {
  await renderWithQuery(<ThreadsList />);
  await screen.findByRole('tab', { name: PAID.name });
  await fireEvent.press(row().getByRole('tab', { name: t.inbox.filterUnread }));
  await waitFor(() => expect(lastThreads()).toBe('/threads?unread=true&page=1&pageSize=25'));

  await fireEvent.press(row().getByRole('tab', { name: PAID.name }));
  await waitFor(() => expect(lastThreads()).toBe(`/threads?list=${PAID.id}&page=1&pageSize=25`));
  expect(selected(t.inbox.filterUnread)).toBe(false);
  expect(selected(PAID.name)).toBe(true);

  await fireEvent.press(row().getByRole('tab', { name: t.inbox.filterUnread }));
  await waitFor(() => expect(lastThreads()).toBe('/threads?unread=true&page=1&pageSize=25'));
  expect(selected(PAID.name)).toBe(false);

  await fireEvent.press(row().getByRole('tab', { name: PAID.name }));
  await fireEvent.press(row().getByRole('tab', { name: t.inbox.filterAll }));
  await waitFor(() => expect(lastThreads()).toBe('/threads?page=1&pageSize=25'));
  expect([t.inbox.filterAll, t.inbox.filterUnread, PAID.name].map(selected)).toEqual([true, false, false]);
});

test('the chips are 32pt with the touch area stretched to 44pt; «＋» is a button that acts', async () => {
  await renderWithQuery(<ThreadsList />);
  await screen.findByRole('tab', { name: PAID.name });
  const all = row().getByRole('tab', { name: t.inbox.filterAll });
  expect(all).toHaveStyle({ minHeight: 32 });
  expect(all.props.hitSlop).toEqual({ top: 6, bottom: 6 });
  // The row is 6 + 32 + 6 = 44pt, so the slop is not clipped by the ScrollView.
  expect(screen.getByLabelText(t.inbox.filterRow).props.contentContainerStyle).toMatchObject({ paddingVertical: 6 });
  await fireEvent.press(row().getByRole('button', { name: t.inbox.lists.new }));
  expect(await screen.findByLabelText(t.inbox.lists.name)).toBeTruthy();
});
