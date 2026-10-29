import type { ThreadView } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { renderWithQuery } from '@/test/query';
import { thread } from '../shared/thread-fixtures';
import { ThreadModeProvider } from '../thread/hooks/thread-mode';
import { ThreadsList } from './ThreadsList';

// Review 2026-10-29 #2 / #3: «بانتظار ردّك» and the lead-stage chips on the chats' one row.
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
// The rows in the order handed to the list (FlashList's recycled cells keep their old tree order).
interface MockListProps {
  paged: { items: { phone_e164: string }[] };
  renderItem: (p: { item: unknown }) => unknown;
  ListEmptyComponent: unknown;
}
jest.mock('@/core/ui/lists/LazyList', () => {
  const { createElement, Fragment } = jest.requireActual('react');
  return {
    LazyList: ({ paged, renderItem, ListEmptyComponent }: MockListProps) =>
      paged.items.length === 0
        ? ListEmptyComponent
        : createElement(Fragment, null, ...paged.items.map((item) => createElement(Fragment, { key: item.phone_e164 }, renderItem({ item })))),
  };
});

// Invented chats, newest message first as the API sends them.
const chat = (name: string, at: string, last_direction: ThreadView['last_direction']): ThreadView => ({
  ...thread,
  phone_e164: `+9665500000${name.length}${at.slice(11, 13)}`,
  display_name: name,
  last_message_at: at,
  last_direction,
});
const answered = chat('سارة', '2026-10-29T10:00:00Z', 'outbound');
const fresh = chat('منى', '2026-10-29T09:30:00Z', 'inbound');
const old = chat('ليلى أحمد', '2026-10-29T07:00:00Z', 'inbound');
const page = (items: ThreadView[]) => ({ items, total: items.length, page: 1, pageSize: 25 });
const threadCalls = () => mockApiFetch.mock.calls.map(([p]: [string]) => p).filter((p) => p.startsWith('/threads'));
const chips = () => within(screen.getByLabelText(t.inbox.filterRow));
const titles = () => [answered, fresh, old].map((th) => th.display_name ?? '').filter((n) => screen.queryByText(n));

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockImplementation(async (p: string) =>
    p.includes('status=') ? page([fresh]) : p.startsWith('/threads') ? page([answered, old, fresh]) : { items: [] },
  );
});

async function openSales() {
  await renderWithQuery(
    <TreeBaseProvider value="/sales">
      <ThreadsList />
    </TreeBaseProvider>,
  );
  await screen.findByText(answered.display_name ?? '');
}

test('«بانتظار ردّك»: only chats whose last message is the family’s, the newest wait first, no extra request', async () => {
  await openSales();
  const before = threadCalls().length;
  await fireEvent.press(chips().getByRole('tab', { name: t.inbox.filterWaiting }));
  expect(chips().getByRole('tab', { name: t.inbox.filterWaiting, selected: true })).toBeTruthy();
  expect(screen.queryByText(answered.display_name ?? '')).toBeNull();
  const rows = screen.getAllByRole('button').filter((b) => within(b).queryByText(/منى|ليلى/));
  expect(rows.map((b) => (within(b).queryByText('منى') ? 'منى' : 'ليلى'))).toEqual(['منى', 'ليلى']);
  expect(threadCalls()).toHaveLength(before);
  await fireEvent.press(chips().getByRole('tab', { name: t.inbox.filterAll }));
  expect(titles()).toHaveLength(3);
});

test('nothing waiting: its own empty title', async () => {
  mockApiFetch.mockImplementation(async () => page([answered]));
  await openSales();
  await fireEvent.press(chips().getByRole('tab', { name: t.inbox.filterWaiting }));
  expect(screen.getByText(t.inbox.emptyWaiting)).toBeTruthy();
});

test('nothing waiting on the first page: it pages on by itself until a waiting chat shows', async () => {
  mockApiFetch.mockImplementation(async (p: string) =>
    p.includes('page=2') ? { ...page([old]), page: 2, total: 26 } : { ...page([answered]), total: 26 },
  );
  await openSales();
  await fireEvent.press(chips().getByRole('tab', { name: t.inbox.filterWaiting }));
  expect(await screen.findByText(old.display_name ?? '')).toBeTruthy();
  expect(screen.queryByText(t.inbox.emptyWaiting)).toBeNull();
});

test('a stage chip asks GET /threads?status= (the sales scope reads every lead) and is selected', async () => {
  await openSales();
  await fireEvent.press(chips().getByRole('tab', { name: t.enums.leadStatus.trial_booked }));
  await waitFor(() => expect(threadCalls()).toContain('/threads?status=trial_booked&page=1&pageSize=25'));
  expect(await screen.findByText(fresh.display_name ?? '')).toBeTruthy();
  expect(screen.queryByText(answered.display_name ?? '')).toBeNull();
  expect(chips().getByRole('tab', { name: t.enums.leadStatus.trial_booked, selected: true })).toBeTruthy();
  // «مشترك» and «مفقود» are not chips: a family by then, or not chased from here.
  expect(chips().queryByRole('tab', { name: t.enums.leadStatus.converted })).toBeNull();
  expect(chips().queryByRole('tab', { name: t.enums.leadStatus.lost })).toBeNull();
});

test('a teacher gets neither: no lead on her chats', async () => {
  await renderWithQuery(
    <ThreadModeProvider value={{ kind: 'teacher', teacherId: 't-1' }}>
      <ThreadsList />
    </ThreadModeProvider>,
  );
  await screen.findByText(answered.display_name ?? '');
  expect(chips().queryByRole('tab', { name: t.inbox.filterWaiting })).toBeNull();
  expect(chips().queryByRole('tab', { name: t.enums.leadStatus.new })).toBeNull();
});
