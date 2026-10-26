import { renderHook } from '@testing-library/react-native';
import { Animated, Easing } from 'react-native';
import { useCycle } from './use-cycle';

// The linear loop behind the ring and the dots: native driver, one-off delay, Reduce Motion.
const timing = jest.spyOn(Animated, 'timing');
const delay = jest.spyOn(Animated, 'delay');
const loop = jest.spyOn(Animated, 'loop');

beforeEach(() => jest.clearAllMocks());

test('0 → 1 linearly over the duration, looped, on the native driver', async () => {
  await renderHook(() => useCycle({ duration: 1600, still: false }));
  expect(loop).toHaveBeenCalledTimes(1);
  expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 1, duration: 1600, easing: Easing.linear, useNativeDriver: true }));
  expect(delay).not.toHaveBeenCalled();
});

test('a delay runs once, before the first turn', async () => {
  await renderHook(() => useCycle({ duration: 1200, delay: 300, still: false }));
  expect(delay).toHaveBeenCalledWith(300);
});

test('Reduce Motion: no loop, the value rests at 0', async () => {
  const { result } = await renderHook(() => useCycle({ duration: 1200, still: true }));
  expect(loop).not.toHaveBeenCalled();
  expect(JSON.stringify(result.current)).toBe('0');
});
