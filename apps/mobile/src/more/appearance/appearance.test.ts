import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import {
  APPEARANCE_KEY,
  loadAppearance,
  restoreAppearance,
  saveAppearance,
  toColorScheme,
} from './appearance';

let setScheme: jest.SpyInstance;

beforeEach(async () => {
  await AsyncStorage.clear();
  setScheme = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

test('تلقائي follows the phone; فاتح / ليلي force the scheme', () => {
  expect(toColorScheme('auto')).toBe('unspecified');
  expect(toColorScheme('light')).toBe('light');
  expect(toColorScheme('dark')).toBe('dark');
});

test('load: nothing saved, or garbage, is auto', async () => {
  await expect(loadAppearance()).resolves.toBe('auto');
  await AsyncStorage.setItem(APPEARANCE_KEY, 'sepia');
  await expect(loadAppearance()).resolves.toBe('auto');
});

test('load: unreadable storage is auto, not a crash', async () => {
  jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('io'));
  await expect(loadAppearance()).resolves.toBe('auto');
});

test('save applies the OS override at once and remembers it', async () => {
  await saveAppearance('dark');
  expect(setScheme).toHaveBeenCalledWith('dark');
  await expect(loadAppearance()).resolves.toBe('dark');
  await saveAppearance('auto');
  expect(setScheme).toHaveBeenLastCalledWith('unspecified');
});

test('save still applies when storage fails', async () => {
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('full'));
  await expect(saveAppearance('light')).resolves.toBeUndefined();
  expect(setScheme).toHaveBeenCalledWith('light');
});

test('restore on boot: re-applies a saved override, leaves auto alone', async () => {
  await expect(restoreAppearance()).resolves.toBe('auto');
  expect(setScheme).not.toHaveBeenCalled();
  await AsyncStorage.setItem(APPEARANCE_KEY, 'light');
  await expect(restoreAppearance()).resolves.toBe('light');
  expect(setScheme).toHaveBeenCalledWith('light');
});
