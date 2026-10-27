import type { MessageView } from '@ab/shared';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { renderWithQuery } from '@/test/query';
import { MessageList } from './MessageList';
import { dayLabel } from '../days/day-label';
import { TOP_DAY_HIDE_MS } from '../days/use-top-day';
import { clock } from '../hooks/message-text';
import { cachedThread, detail, message, PHONE } from '../../shared/thread-fixtures';
import type { useThread } from '../../thread/hooks/use-thread';

// Owner 2026-10-27: a chip over each day's first message, a floating day while scrolling, and the
// bubbles' times without the date.
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: async () => ({ id: 'u1', role: 'admin', permissions: [] }),
}));

type ThreadQuery = ReturnType<typeof useThread>;
const at = (id: string, created_at: string) => message({ id, direction: 'inbound', body: `نص ${id}`, created_at });
const A = at('a', '2026-09-29T10:00:00Z');
const B = at('b', '2026-09-29T16:39:00Z');
const C = at('c', '2026-10-02T08:00:00Z');
const query = (rows: MessageView[]) =>
  ({ data: cachedThread(detail(rows)), hasNextPage: false, isFetchingNextPage: false, refetch: jest.fn(), fetchNextPage: jest.fn() }) as unknown as ThreadQuery;
const show = () => renderWithQuery(<MessageList phone={PHONE} query={query([A, B, C])} />);
const still = { nativeEvent: { contentOffset: { x: 0, y: 0 }, contentSize: { width: 1, height: 1 }, layoutMeasurement: { width: 1, height: 1 }, velocity: { x: 0, y: 0 } } };
const viewable = (rows: MessageView[]) =>
  act(() => screen.getByTestId('message-list').props.onViewableItemsChanged({ viewableItems: rows.map((item, i) => ({ item, index: i, key: item.id, isViewable: true })), changed: [] }));

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test('a day chip over the first message of each day only', async () => {
  await show();
  expect(screen.getByTestId('day-a')).toHaveTextContent(dayLabel(A.created_at));
  expect(screen.queryByTestId('day-b')).toBeNull();
  expect(screen.getByTestId('day-c')).toHaveTextContent(dayLabel(C.created_at));
});

test('a bubble shows its time only («16:39»), the day is in the chip', async () => {
  await show();
  expect(screen.getByText(clock(B.created_at, '24'))).toBeTruthy();
  expect(clock(B.created_at, '24', 'UTC')).toBe('16:39');
  expect(screen.queryByText(/\d+\/\d+ \d\d:\d\d/)).toBeNull();
});

test('while scrolling, the topmost message’s day floats on top, and fades out after the scroll stops', async () => {
  jest.useFakeTimers();
  await show();
  expect(screen.queryByTestId('floating-day')).toBeNull();
  // Inverted: the newest is index 0, the topmost on screen is the highest index.
  await viewable([C, B]);
  await fireEvent(screen.getByTestId('message-list'), 'scrollBeginDrag');
  expect(screen.getByTestId('floating-day')).toHaveTextContent(dayLabel(B.created_at));
  await fireEvent(screen.getByTestId('message-list'), 'momentumScrollEnd', still);
  await act(() => jest.advanceTimersByTime(TOP_DAY_HIDE_MS + 500));
  expect(screen.queryByTestId('floating-day')).toBeNull();
});

test('Reduce Motion: the floating day shows and hides without a fade', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  jest.useFakeTimers();
  await show();
  await act(async () => undefined);
  await viewable([C]);
  await fireEvent(screen.getByTestId('message-list'), 'scrollBeginDrag');
  expect(screen.getByTestId('floating-day').props.style.opacity).toBe(1);
  await fireEvent(screen.getByTestId('message-list'), 'scrollEndDrag', still);
  await act(() => jest.advanceTimersByTime(TOP_DAY_HIDE_MS));
  expect(screen.queryByTestId('floating-day')).toBeNull();
});
