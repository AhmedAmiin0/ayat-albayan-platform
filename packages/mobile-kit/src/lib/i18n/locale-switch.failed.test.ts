import { LOCALE_STORAGE_KEY } from '@ab/core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reloadAppAsync } from 'expo';
import { I18nManager } from 'react-native';
import { RELOAD_KEY, setLocale, syncLocale } from './locale-switch';

// A reload that fails puts this run's direction back: the flags persist natively, so leaving the
// other language's would open the next cold start mirrored under this run's strings.
jest.mock('expo', () => ({ reloadAppAsync: jest.fn(async () => undefined) }));

let allow: jest.SpyInstance;
let force: jest.SpyInstance;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  allow = jest.spyOn(I18nManager, 'allowRTL');
  force = jest.spyOn(I18nManager, 'forceRTL');
  jest.mocked(reloadAppAsync).mockRejectedValueOnce(new Error('no reload'));
});
afterEach(() => jest.restoreAllMocks());

test('boot gate: a failed reload opens the app with its own direction and no marker', async () => {
  expect(await syncLocale('en')).toBe(false); // an Arabic phone (jest.setup), an LTR run
  expect(force.mock.calls).toEqual([[true], [false]]);
  expect(allow.mock.calls).toEqual([[true], [false]]);
  // No marker: the next cold start retries instead of reading it as «the flag did not stick».
  expect(await AsyncStorage.getItem(RELOAD_KEY)).toBeNull();
});

test('the next cold start after a failed boot reload tries again', async () => {
  await syncLocale('en');
  expect(await syncLocale('en')).toBe(true);
  expect(reloadAppAsync).toHaveBeenCalledTimes(2);
});

test('setLocale: the choice stays saved, the direction goes back, a manual restart is asked', async () => {
  expect(await setLocale('en')).toBe('restart'); // this jest run is RTL (Arabic)
  expect(await AsyncStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en');
  expect(force.mock.calls).toEqual([[false], [true]]);
  expect(allow.mock.calls).toEqual([[false], [true]]);
  expect(await AsyncStorage.getItem(RELOAD_KEY)).toBeNull();
});
