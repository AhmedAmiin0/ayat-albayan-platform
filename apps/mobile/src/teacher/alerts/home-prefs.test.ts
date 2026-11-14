import { DEFAULT_HOME_PREFS, HOME_PREFS_KEY } from '@ab/client-core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { resetHomePrefs, saveHomePrefs, useHomePrefs } from './home-prefs';

afterEach(async () => {
  resetHomePrefs();
  await AsyncStorage.clear();
});

test('everything on and comfortable rows when nothing is saved', async () => {
  const { result } = await renderHook(() => useHomePrefs());
  expect(result.current).toEqual(DEFAULT_HOME_PREFS);
});

test('the saved choice is restored on first use', async () => {
  await AsyncStorage.setItem(HOME_PREFS_KEY, JSON.stringify({ hero: false, density: 'compact' }));
  const { result } = await renderHook(() => useHomePrefs());
  await waitFor(() => expect(result.current.hero).toBe(false));
  expect(result.current.density).toBe('compact');
});

test('a change re-renders at once and is saved on the device', async () => {
  const { result } = await renderHook(() => useHomePrefs());
  await act(async () => saveHomePrefs({ ...DEFAULT_HOME_PREFS, ended: false }));
  expect(result.current.ended).toBe(false);
  expect(JSON.parse((await AsyncStorage.getItem(HOME_PREFS_KEY)) ?? '{}')).toMatchObject({ ended: false });
});

test('unreadable storage keeps the defaults', async () => {
  jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('locked'));
  const { result } = await renderHook(() => useHomePrefs());
  await act(async () => undefined);
  expect(result.current).toEqual(DEFAULT_HOME_PREFS);
});
