import type { LessonView } from '@ab/schedule';
import { act, renderHook } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { lesson } from '@/today/testing/fixtures';
import type { DayQuery, TodaySource } from './today-source';
import { useTodayView } from './use-today-view';

const UPDATED = Date.parse('2026-10-01T12:00:00Z');

function sourceOf(day: Partial<DayQuery<LessonView>>): TodaySource<LessonView> {
  const query: DayQuery<LessonView> = {
    data: undefined,
    isError: false,
    isPending: false,
    isRefetching: false,
    dataUpdatedAt: UPDATED,
    refetch: jest.fn(),
    ...day,
  };
  return { tree: 'admin', schedule: '/schedule', useDay: () => query };
}

const view = (day: Partial<DayQuery<LessonView>>) =>
  renderHook(() => useTodayView(sourceOf(day)), {
    wrapper: queryWrapper(createTestQueryClient()),
  });

beforeEach(() =>
  jest.useFakeTimers({ now: new Date('2026-10-01T13:20:00Z'), advanceTimers: true }),
);
afterEach(() => jest.useRealTimers());

test('a day on screen with no failed refetch: loaded, not stale', async () => {
  const { result } = await view({ data: [lesson({ id: 'l1' })] });
  expect(result.current.loaded).toBe(true);
  expect(result.current.stale).toBeUndefined();
  expect(result.current.lessons).toHaveLength(1);
  expect(result.current.nothing).toBe(false);
});

test('a failed refetch over a saved day says how old it is', async () => {
  const { result } = await view({ data: [lesson({ id: 'l1' })], isError: true });
  expect(result.current.stale).toMatch(/\d/);
});

test('a failed first read is neither loaded nor stale, and shows nothing', async () => {
  const { result } = await view({ isError: true });
  expect(result.current.loaded).toBe(false);
  expect(result.current.stale).toBeUndefined();
  expect(result.current.nothing).toBe(true);
});

test('the filter starts on all and follows a pick', async () => {
  const { result } = await view({ data: [] });
  expect(result.current.filter).toBe('all');
  await act(() => result.current.setFilter('completed'));
  expect(result.current.filter).toBe('completed');
});
