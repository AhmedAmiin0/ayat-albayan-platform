import { CLOCK_STORAGE_KEY } from '@ab/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { clockCycle, setClockPref, useClockCycle, useClockPref } from './clock-store';

jest.mock('./device-clock', () => ({ deviceUses24: () => true }));

// One store per file: the first test sees the saved choice restored on first use.

test('the saved choice is restored on first use', async () => {
  await AsyncStorage.setItem(CLOCK_STORAGE_KEY, '12');
  const { result } = await renderHook(() => useClockPref());
  await waitFor(() => expect(result.current[0]).toBe('12'));
  expect(clockCycle()).toBe('12');
});

test('an override re-renders subscribers at once and is saved', async () => {
  const { result } = await renderHook(() => useClockCycle());
  await act(async () => setClockPref('auto'));
  expect(result.current).toBe('24'); // a 24-hour phone
  await act(async () => setClockPref('12'));
  expect(result.current).toBe('12');
  expect(await AsyncStorage.getItem(CLOCK_STORAGE_KEY)).toBe('12');
});
