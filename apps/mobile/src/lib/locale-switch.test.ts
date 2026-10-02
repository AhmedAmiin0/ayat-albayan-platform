import { LOCALE_STORAGE_KEY } from '@ab/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, waitFor } from '@testing-library/react-native';
import { reloadAppAsync } from 'expo';
import { I18nManager } from 'react-native';
import { RELOAD_KEY, setLocale, syncLocale, useLocaleReady } from './locale-switch';

jest.mock('expo', () => ({ reloadAppAsync: jest.fn(async () => undefined) }));

let allow: jest.SpyInstance;
let force: jest.SpyInstance;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  allow = jest.spyOn(I18nManager, 'allowRTL');
  force = jest.spyOn(I18nManager, 'forceRTL');
});
afterEach(() => jest.restoreAllMocks());

test('first start on an LTR phone, nothing saved: Arabic RTL, one reload', async () => {
  expect(await syncLocale('en')).toBe(true);
  expect(allow).toHaveBeenCalledWith(true);
  expect(force).toHaveBeenCalledWith(true);
  expect(reloadAppAsync).toHaveBeenCalledTimes(1);
  expect(await AsyncStorage.getItem(RELOAD_KEY)).toBe('ar');
});

test('English saved on an RTL run: allow and force off (an Arabic phone stays RTL otherwise)', async () => {
  await AsyncStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  expect(await syncLocale('ar')).toBe(true);
  expect(allow).toHaveBeenCalledWith(false);
  expect(force).toHaveBeenCalledWith(false);
  expect(reloadAppAsync).toHaveBeenCalledTimes(1);
});

test('the run already shows the saved language: no flag change, no reload', async () => {
  expect(await syncLocale('ar')).toBe(false); // existing installs: RTL, nothing saved
  await AsyncStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  expect(await syncLocale('en')).toBe(false);
  expect(force).not.toHaveBeenCalled();
  expect(reloadAppAsync).not.toHaveBeenCalled();
});

test('a reload that did not stick opens as it is instead of reloading forever', async () => {
  await AsyncStorage.multiSet([
    [LOCALE_STORAGE_KEY, 'en'],
    [RELOAD_KEY, 'en'],
  ]);
  expect(await syncLocale('ar')).toBe(false);
  expect(reloadAppAsync).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(RELOAD_KEY)).toBeNull();
});

test('a reload that worked clears its marker', async () => {
  await AsyncStorage.multiSet([
    [LOCALE_STORAGE_KEY, 'en'],
    [RELOAD_KEY, 'en'],
  ]);
  expect(await syncLocale('en')).toBe(false);
  expect(await AsyncStorage.getItem(RELOAD_KEY)).toBeNull();
});

test('unreadable storage keeps this run language', async () => {
  jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('io'));
  expect(await syncLocale('en')).toBe(false);
  expect(reloadAppAsync).not.toHaveBeenCalled();
});

test('a failed reload still opens the app (the flags apply on the next start)', async () => {
  jest.mocked(reloadAppAsync).mockRejectedValueOnce(new Error('no reload'));
  expect(await syncLocale('en')).toBe(false);
  expect(force).toHaveBeenCalledWith(true);
});

test('setLocale saves the choice, sets the direction, reloads', async () => {
  await setLocale('en');
  expect(await AsyncStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en');
  expect(allow).toHaveBeenCalledWith(false);
  expect(force).toHaveBeenCalledWith(false);
  expect(reloadAppAsync).toHaveBeenCalledTimes(1);
});

test('setLocale: a choice that cannot be saved changes nothing (the gate would undo it)', async () => {
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('full'));
  await setLocale('en');
  expect(force).not.toHaveBeenCalled();
  expect(reloadAppAsync).not.toHaveBeenCalled();
});

test('useLocaleReady: ready when the run matches, never while reloading', async () => {
  const matching = await renderHook(() => useLocaleReady());
  await waitFor(() => expect(matching.result.current).toBe(true));

  await AsyncStorage.setItem(LOCALE_STORAGE_KEY, 'en'); // this jest run is RTL (jest.setup)
  const reloading = await renderHook(() => useLocaleReady());
  await waitFor(() => expect(reloadAppAsync).toHaveBeenCalledTimes(1));
  expect(reloading.result.current).toBe(false);
});
