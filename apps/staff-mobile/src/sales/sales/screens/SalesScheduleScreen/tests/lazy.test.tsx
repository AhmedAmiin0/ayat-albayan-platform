import { screen } from '@testing-library/react-native';
import { fakeNow } from '@/test/fake-now';
import { confirmingQueryClient, renderWithQuery } from '@/test/query';
import { scheduleLesson, teacher } from '@/sales/sales/testing/fixtures';
import { SalesScheduleScreen } from '@/sales/sales/screens/SalesScheduleScreen';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({}),
}));

const one = (id: string, name: string) =>
  scheduleLesson({ id, students: [{ id: `s-${id}`, code: 'AB-0300', name }] });
const LESSONS = [one('a', 'سلمى'), one('b', 'هند')];

beforeEach(() => {
  mockApiFetch.mockImplementation(async (path: string) =>
    path === '/sales/teachers' ? [teacher()] : { date: '2026-10-12', lessons: LESSONS },
  );
  fakeNow(new Date('2026-10-12T10:00:00.000Z'));
});
afterEach(() => jest.useRealTimers());

test("the day's lessons sit in the recycling LazyList, each cell matched by lesson id", async () => {
  await renderWithQuery(<SalesScheduleScreen />, confirmingQueryClient());
  expect(await screen.findByText('هند')).toBeTruthy();
  const list = screen.getByTestId('day-board');
  // FlatList's VirtualizedList hands its scroll view getItemCount; FlashList does not.
  expect(list.props.getItemCount).toBeUndefined();
  const keyOf = list.props.keyExtractor as (row: { id: string }, i: number) => string;
  expect(LESSONS.map((row, i) => keyOf(row, i))).toEqual(['a', 'b']);
});
