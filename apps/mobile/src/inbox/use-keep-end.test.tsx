import { fireEvent, renderHook, screen } from '@testing-library/react-native';
import { FlatList } from 'react-native';
import { renderWithQuery } from '@/test/query';
import { MessageList } from './MessageList';
import { inbound } from './thread-fixtures';
import type { useThread } from './use-thread';
import { NEAR_END, useKeepEnd } from './use-keep-end';

// Android: the keyboard shrinks the list; the newest message must stay in sight (review of #112).
const layout = (height: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width: 360, height } } });
const scroll = (fromEnd: number) => ({
  nativeEvent: {
    contentOffset: { x: 0, y: 1000 - 400 - fromEnd },
    contentSize: { width: 360, height: 1000 },
    layoutMeasurement: { width: 360, height: 400 },
  },
});

let frames: (() => void)[] = [];
beforeEach(() => {
  frames = [];
  jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
    frames.push(() => cb(0));
    return frames.length;
  });
});
afterEach(() => jest.restoreAllMocks());

async function hook() {
  const scrollToEnd = jest.fn();
  const { result } = await renderHook(() => useKeepEnd({ current: { scrollToEnd } }));
  return { keep: result.current, scrollToEnd };
}

test('a smaller layout at the end scrolls to the end after the new height is in', async () => {
  const { keep, scrollToEnd } = await hook();
  keep.onLayout(layout(600) as never);
  keep.onLayout(layout(340) as never);
  expect(scrollToEnd).not.toHaveBeenCalled(); // not with the pre-shrink metrics
  frames.forEach((f) => f());
  expect(scrollToEnd).toHaveBeenCalledWith({ animated: false });
});

test('a larger layout (the keyboard closes) and the first layout do not scroll', async () => {
  const { keep, scrollToEnd } = await hook();
  keep.onLayout(layout(340) as never);
  keep.onLayout(layout(600) as never);
  frames.forEach((f) => f());
  expect(frames).toHaveLength(0);
  expect(scrollToEnd).not.toHaveBeenCalled();
});

test('near the end still follows; scrolled up to older messages stays put', async () => {
  const { keep, scrollToEnd } = await hook();
  keep.onLayout(layout(600) as never);
  keep.onScroll(scroll(NEAR_END) as never);
  keep.onLayout(layout(500) as never);
  keep.onScroll(scroll(NEAR_END + 200) as never);
  keep.onLayout(layout(340) as never);
  frames.forEach((f) => f());
  expect(scrollToEnd).toHaveBeenCalledTimes(1);
});

test('MessageList: the list shrinking under the keyboard keeps the newest message in sight', async () => {
  const toEnd = jest.spyOn(FlatList.prototype, 'scrollToEnd');
  const query = { data: { pages: [{ messages: [inbound] }] }, hasNextPage: false, isRefetching: false, isFetchingNextPage: false } as unknown as ReturnType<typeof useThread>;
  await renderWithQuery(<MessageList phone="+966552147730" query={query} />);
  const list = screen.getByTestId('message-list');
  await fireEvent(list, 'layout', layout(600));
  toEnd.mockClear();
  await fireEvent(list, 'layout', layout(340));
  frames.forEach((f) => f());
  expect(toEnd).toHaveBeenCalledWith({ animated: false });
});
