import type { MessageView } from '@ab/shared';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { renderWithQuery } from '@/test/query';
import { MessageList } from './MessageList';
import { dayLabel } from '../days/day-label';
import { cachedThread, detail, message, PHONE } from '../../shared/thread-fixtures';
import type { useThread } from '../../thread/hooks/use-thread';

// Owner 2026-10-27 (screenshot): the floating «الأربعاء» was drawn over the inline «الأحد». As
// WhatsApp, it hides while an inline separator is in its band and comes back once it scrolled past.
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: async () => ({ id: 'u1', role: 'admin', permissions: [] }),
}));

type ThreadQuery = ReturnType<typeof useThread>;
const at = (id: string, created_at: string) => message({ id, direction: 'inbound', body: `نص ${id}`, created_at });
const A = at('a', '2026-09-29T10:00:00Z');
const B = at('b', '2026-09-29T16:39:00Z');
const C = at('c', '2026-10-02T08:00:00Z');
const ROWS = [C, B, A]; // the inverted list: newest first
// Content frames from the visual bottom; the list shows 220pt. C and A carry a separator.
const FRAMES = { c: { y: 4, height: 200 }, b: { y: 204, height: 50 }, a: { y: 254, height: 200 } };
const LENGTH = 220;
const query = () =>
  ({ data: cachedThread(detail([...ROWS].reverse())), hasNextPage: false, isFetchingNextPage: false, refetch: jest.fn(), fetchNextPage: jest.fn() }) as unknown as ThreadQuery;
const list = () => screen.getByTestId('message-list');
const floating = () => screen.queryByTestId('floating-day');

async function open() {
  await renderWithQuery(<MessageList phone={PHONE} query={query()} />);
  for (const m of ROWS) {
    const { y, height } = FRAMES[m.id as keyof typeof FRAMES];
    await fireEvent(screen.getByTestId(`message-row-${m.id}`), 'layout', { nativeEvent: { layout: { x: 0, y, width: 360, height } } });
  }
  await fireEvent(list(), 'scrollBeginDrag');
}
/** Scrolls to `offset` with the rows `on` screen (by id). */
async function scrollTo(offset: number, on: MessageView[]) {
  const nativeEvent = { contentOffset: { x: 0, y: offset }, contentSize: { width: 360, height: 458 }, layoutMeasurement: { width: 360, height: LENGTH } };
  await fireEvent.scroll(list(), { nativeEvent });
  const viewableItems = on.map((item) => ({ item, index: ROWS.indexOf(item), key: item.id, isViewable: true }));
  await act(() => list().props.onViewableItemsChanged({ viewableItems, changed: [] }));
}

afterEach(() => jest.restoreAllMocks());

test('the inline separator in the top band hides the floating chip; once it scrolled past, the chip is back', async () => {
  await open();
  await scrollTo(0, [C, B]); // C's separator 26pt under the top: in the band
  expect(screen.getByTestId('day-c')).toBeTruthy();
  expect(floating()).toBeNull();
  await scrollTo(80, [C, B, A]); // C's separator 106pt down, A's above the screen
  expect(floating()).toHaveTextContent(dayLabel(A.created_at));
  await scrollTo(0, [C, B]);
  expect(floating()).toBeNull();
});

test('scrolling to newer: its separator in the band hides it; once above the top, the chip is back with that day', async () => {
  await open();
  await scrollTo(220, [C, B, A]); // A's separator 8pt above the top, still half on screen
  expect(floating()).toBeNull();
  await scrollTo(150, [C, B, A]); // A's separator wholly above the top; C's 176pt down
  expect(floating()).toHaveTextContent(dayLabel(A.created_at));
});

test('never two chips with the same label: the inline chip of its own day on screen hides it', async () => {
  await open();
  await scrollTo(300, [A]); // A's separator 72pt down, under the band; the floating label is A's day too
  expect(screen.getByTestId('day-a')).toHaveTextContent(dayLabel(A.created_at));
  expect(floating()).toBeNull();
  expect(screen.getAllByText(dayLabel(A.created_at))).toHaveLength(1);
});

test('Reduce Motion: hidden over a separator, then back at once, with no fade', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  await open();
  await act(async () => undefined);
  await scrollTo(0, [C, B]);
  expect(floating()).toBeNull();
  await scrollTo(80, [C, B, A]);
  expect(floating()?.props.style.opacity).toBe(1);
});
