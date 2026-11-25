import type { MessageView } from '@ab/shared';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderWithQuery } from '@/test/query';
import { MessageList } from '@/inbox/messages/components/MessageList/MessageList';
import { cachedThread, detail, message, PHONE } from '@/inbox/shared/thread-fixtures';
import { TOP_DAY_HIDE_MS } from '@/inbox/messages/days/use-top-day';
import type { useThread } from '@/inbox/thread/hooks/use-thread';

jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: async () => ({ id: 'u1', role: 'admin', permissions: [] }),
}));
const mockDraws = { rows: 0, cells: 0 };
jest.mock('@/inbox/messages/list/MessageRow', () => {
  const { memo } = jest.requireActual('react');
  const actual = jest.requireActual('@/inbox/messages/list/MessageRow');
  const Counted = (props: object) => {
    mockDraws.rows += 1;
    return actual.MessageRow.type(props);
  };
  return { ...actual, MessageRow: memo(Counted) };
});
jest.mock('@/inbox/messages/days/DayCell', () => {
  const actual = jest.requireActual('@/inbox/messages/days/DayCell');
  const DayCell = (props: object) => {
    mockDraws.cells += 1;
    return actual.DayCell(props);
  };
  return { ...actual, DayCell };
});

type ThreadQuery = ReturnType<typeof useThread>;
const COUNT = 300;
const HOUR = 3_600_000;
const START = Date.parse('2026-09-01T06:00:00Z');

/** 300 messages, three an hour apart each half day, oldest first as the API pages them. */
const MESSAGES: MessageView[] = Array.from({ length: COUNT }, (_, i) =>
  message({
    id: `m${i}`,
    direction: i % 2 === 0 ? 'inbound' : 'outbound',
    body: `رسالة ${i}`,
    created_at: new Date(START + i * 4 * HOUR).toISOString(),
  }),
);
const NEWEST_FIRST = [...MESSAGES].reverse();
const query = () =>
  ({
    data: cachedThread(detail(MESSAGES)),
    hasNextPage: false,
    isFetchingNextPage: false,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
  }) as unknown as ThreadQuery;
const list = () => screen.getByTestId('message-list');

function viewable(from: number, to: number) {
  const viewableItems = NEWEST_FIRST.slice(from, to).map((item, i) => ({
    item,
    index: from + i,
    key: item.id,
    isViewable: true,
  }));
  return act(() => list().props.onViewableItemsChanged({ viewableItems, changed: [] }));
}

const at = (offset: number) => ({
  nativeEvent: {
    contentOffset: { x: 0, y: offset },
    contentSize: { width: 360, height: COUNT * 60 },
    layoutMeasurement: { width: 360, height: 640 },
    velocity: { x: 0, y: 0 },
  },
});
const scrollTo = (offset: number) => fireEvent.scroll(list(), at(offset));

/** A whole drag: start, a few frames with new rows on screen, end, then the fade out. */
async function dragThrough() {
  await fireEvent(list(), 'scrollBeginDrag', at(0));
  await fireEvent(list(), 'momentumScrollBegin', at(0));
  for (const step of [1, 2, 3]) {
    await scrollTo(step * 200);
    await viewable(step * 3, step * 3 + 10);
  }
  await fireEvent(list(), 'scrollEndDrag', at(600));
  await fireEvent(list(), 'momentumScrollEnd', at(600));
  await act(() => jest.advanceTimersByTime(TOP_DAY_HIDE_MS + 500));
}

beforeEach(() => {
  jest.useFakeTimers();
  Object.assign(mockDraws, { rows: 0, cells: 0 });
});
afterEach(() => jest.useRealTimers());

test('a drag with the floating day redraws no message row and no cell', async () => {
  await renderWithQuery(<MessageList phone={PHONE} query={query()} />);
  await screen.findByText(`رسالة ${COUNT - 1}`);
  const mounted = { ...mockDraws };
  expect(mounted.rows).toBeGreaterThan(0);
  await dragThrough();
  expect(screen.getByTestId('message-list')).toBeTruthy();
  expect(mockDraws).toEqual(mounted);
});

test('the floating day still shows during the drag, with the topmost row on screen', async () => {
  await renderWithQuery(<MessageList phone={PHONE} query={query()} />);
  await screen.findByText(`رسالة ${COUNT - 1}`);
  await fireEvent(list(), 'scrollBeginDrag', at(0));
  await scrollTo(400);
  await viewable(20, 30);
  expect(screen.getByTestId('floating-day')).toBeTruthy();
});
