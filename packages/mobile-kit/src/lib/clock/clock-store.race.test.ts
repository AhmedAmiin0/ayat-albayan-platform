import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import { setClockPref, useClockCycle } from './clock-store';

jest.mock('./device-clock', () => ({ deviceUses24: () => true }));

test('a choice made while the saved one is still loading wins', async () => {
  let release: (value: string) => void = () => undefined;
  jest.spyOn(AsyncStorage, 'getItem').mockImplementationOnce(() => new Promise((resolve) => (release = resolve)));
  const { result } = await renderHook(() => useClockCycle()); // first subscriber: starts the read
  await act(async () => setClockPref('12'));
  await act(async () => release('24')); // the old saved value arrives late
  expect(result.current).toBe('12');
});
