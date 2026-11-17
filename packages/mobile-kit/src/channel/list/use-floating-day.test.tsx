import { act, renderHook } from '@testing-library/react-native';
import { channelMessage } from '../testing/channel-fixtures';
import { useFloatingDay } from './use-floating-day';

const row = (dayText: string) => ({
  item: { message: channelMessage(), dayText, opensDay: false, unread: null },
  key: dayText,
  index: 0,
  isViewable: true,
});

test('the topmost row’s day shows while she scrolls, then fades', async () => {
  jest.useFakeTimers();
  const { result } = await renderHook(() => useFloatingDay());
  await act(async () => result.current.onViewable({ viewableItems: [row('اليوم'), row('أمس')] }));
  expect(result.current.label).toBe('أمس');
  await act(async () => result.current.scroll.onScrollBeginDrag());
  expect(result.current.opacity).toBeTruthy();
  await act(async () => result.current.scroll.onMomentumScrollEnd());
  await act(async () => jest.runAllTimers());
  jest.useRealTimers();
});
