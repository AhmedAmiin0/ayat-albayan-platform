import { act, renderHook } from '@testing-library/react-native';
import { HOLD_MS, useHoldPress } from './use-hold-press';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const setup = async (withHold = true) => {
  const onPress = jest.fn();
  const onHold = jest.fn();
  const { result } = await renderHook(() => useHoldPress({ onPress, onHold: withHold ? onHold : undefined }));
  return { onPress, onHold, press: () => result.current };
};

test('a tap opens, no hold', async () => {
  const s = await setup();
  await act(async () => {
    s.press().onPressIn();
    jest.advanceTimersByTime(100);
    s.press().onPressOut();
    s.press().onPress();
  });
  expect(s.onPress).toHaveBeenCalledTimes(1);
  expect(s.onHold).not.toHaveBeenCalled();
});

test('a 350 ms hold opens the menu, and the release that follows is not a tap', async () => {
  const s = await setup();
  await act(async () => {
    s.press().onPressIn();
    jest.advanceTimersByTime(HOLD_MS);
  });
  expect(s.onHold).toHaveBeenCalledTimes(1);
  await act(async () => {
    s.press().onPressOut();
    s.press().onPress();
  });
  expect(s.onPress).not.toHaveBeenCalled();
});

test('a scroll (press out) before 350 ms cancels the hold', async () => {
  const s = await setup();
  await act(async () => {
    s.press().onPressIn();
    jest.advanceTimersByTime(200);
    s.press().onPressOut();
    jest.advanceTimersByTime(500);
  });
  expect(s.onHold).not.toHaveBeenCalled();
});

test('without a menu a hold is just a tap', async () => {
  const s = await setup(false);
  await act(async () => {
    s.press().onPressIn();
    jest.advanceTimersByTime(1000);
    s.press().onPress();
  });
  expect(s.onPress).toHaveBeenCalledTimes(1);
});
