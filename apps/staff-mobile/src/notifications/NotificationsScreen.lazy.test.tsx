import { screen } from '@testing-library/react-native';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { fullAccessMe } from '@/test/staff-me';
import { NotificationsScreen } from './NotificationsScreen';

const mockApiFetch = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));

const at = '2026-10-12T08:00:00.000Z';
const note = (id: string, title: string) => ({
  id,
  kind: 'new_message',
  title,
  body: 'أم سلمى',
  data: { phone: '+966552147730' },
  created_at: at,
  read_at: at,
});
const items = [note('n1', 'رسالة أولى'), note('n2', 'رسالة ثانية')];
const page = { items, total: 2, page: 1, pageSize: 20, unread: 0 };
const me = fullAccessMe('admin');

test('the rows sit in the recycling LazyList, each recycled cell matched by its id', async () => {
  mockApiFetch.mockImplementation(async (p: string) => (p === '/auth/me' ? me : page));
  await renderWithQuery(
    <NotificationsScreen tree="admin" />,
    createTestQueryClient({ meFromApi: true }),
  );
  expect(await screen.findByText('رسالة ثانية')).toBeTruthy();
  const list = screen.getByTestId('notifications-list');
  // FlatList's VirtualizedList hands its scroll view getItemCount; FlashList does not.
  expect(list.props.getItemCount).toBeUndefined();
  const keyOf = list.props.keyExtractor as (row: { id: string }, i: number) => string;
  expect(items.map((row, i) => keyOf(row, i))).toEqual(['n1', 'n2']);
});
