import { act, renderHook } from '@testing-library/react-native';
import { channelMessage } from '../testing/channel-fixtures';
import type { ChannelRow } from '@ab/client-core';
import { useFloatingDay } from './use-floating-day';

const row = (dayText: string, index: number, opensDay = false) => ({
  item: {
    ...{ message: channelMessage({ id: dayText }), dayText, opensDay },
    ...{ unread: null, space: 0, followUp: false },
  } satisfies ChannelRow,
  key: dayText,
  index,
  isViewable: true,
});
const layout = (y: number, height: number) => ({ x: 0, y, width: 300, height });

test('the topmost row’s day shows while she scrolls, then fades', async () => {
  jest.useFakeTimers();
  const { result } = await renderHook(() => useFloatingDay());
  const viewableItems = [row('اليوم', 0), row('أمس', 1)];
  await act(async () => result.current.onViewable({ viewableItems }));
  expect(result.current.label).toBe('أمس');
  await act(async () => result.current.scroll.onScrollBeginDrag());
  expect(result.current.opacity).toBeTruthy();
  await act(async () => result.current.scroll.onMomentumScrollEnd());
  await act(async () => jest.runAllTimers());
  jest.useRealTimers();
});

test('an inline chip at the top of the list hides the floating one (never two chips)', async () => {
  const { result } = await renderHook(() => useFloatingDay());
  await act(async () =>
    result.current.scroll.onLayout({ nativeEvent: { layout: layout(0, 600) } } as never),
  );
  await act(async () => result.current.frame('أمس', layout(560, 40)));
  const viewableItems = [row('اليوم', 0), row('أمس', 1, true)];
  await act(async () => result.current.onViewable({ viewableItems }));
  expect(result.current.label).toBeNull();
  await act(async () => result.current.frame('أمس', null));
  expect(result.current.label).toBe('أمس');
});
