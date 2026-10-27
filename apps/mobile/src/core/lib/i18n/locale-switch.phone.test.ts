import { LOCALE_STORAGE_KEY } from '@ab/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reloadAppAsync } from 'expo';
import { getLocales } from 'expo-localization';
import { I18nManager } from 'react-native';
import { RELOAD_KEY, phoneLocale, syncLocale } from './locale-switch';

// Language and direction follow the phone like WhatsApp (owner 2026-10-27); «اللغة» overrides it.
jest.mock('expo', () => ({ reloadAppAsync: jest.fn(async () => undefined) }));
jest.mock('expo-localization', () => ({ getLocales: jest.fn() }));

const phone = (textDirection: 'rtl' | 'ltr', languageTag: string) =>
  jest.mocked(getLocales).mockReturnValue([{ languageTag, textDirection } as ReturnType<typeof getLocales>[number]]);

let allow: jest.SpyInstance;
let force: jest.SpyInstance;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  allow = jest.spyOn(I18nManager, 'allowRTL');
  force = jest.spyOn(I18nManager, 'forceRTL');
});
afterEach(() => jest.restoreAllMocks());

test('(a) English phone, nothing saved, an RTL run (forceRTL kept by older builds): English LTR, one reload', async () => {
  phone('ltr', 'en-US');
  expect(await syncLocale('ar')).toBe(true);
  expect(allow).toHaveBeenCalledWith(false);
  expect(force).toHaveBeenCalledWith(false);
  expect(reloadAppAsync).toHaveBeenCalledTimes(1);
  expect(await AsyncStorage.getItem(RELOAD_KEY)).toBe('en');
});

test('(a) the reload that did not stick: the next start opens as it is (no loop)', async () => {
  phone('ltr', 'en-US');
  await AsyncStorage.setItem(RELOAD_KEY, 'en');
  expect(await syncLocale('ar')).toBe(false);
  expect(reloadAppAsync).not.toHaveBeenCalled();
});

test('(a) the reload worked: English run, no further reload, marker cleared', async () => {
  phone('ltr', 'en-US');
  await AsyncStorage.setItem(RELOAD_KEY, 'en');
  expect(await syncLocale('en')).toBe(false);
  expect(reloadAppAsync).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(RELOAD_KEY)).toBeNull();
});

test('(b) Arabic phone, nothing saved, an RTL run: no reload', async () => {
  phone('rtl', 'ar-SA');
  expect(await syncLocale('ar')).toBe(false);
  expect(force).not.toHaveBeenCalled();
  expect(reloadAppAsync).not.toHaveBeenCalled();
});

test('(c) a saved Arabic choice wins on an English phone', async () => {
  phone('ltr', 'en-US');
  await AsyncStorage.setItem(LOCALE_STORAGE_KEY, 'ar');
  expect(await syncLocale('ar')).toBe(false);
  expect(await syncLocale('en')).toBe(true);
  expect(force).toHaveBeenCalledWith(true);
});

test('(d) a saved English choice wins on an Arabic phone', async () => {
  phone('rtl', 'ar-EG');
  await AsyncStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  expect(await syncLocale('en')).toBe(false);
  expect(await syncLocale('ar')).toBe(true);
  expect(allow).toHaveBeenCalledWith(false);
  expect(force).toHaveBeenCalledWith(false);
});

test('phoneLocale: no native module or no locale never breaks boot', () => {
  jest.mocked(getLocales).mockImplementation(() => {
    throw new Error('Cannot find native module ExpoLocalization');
  });
  expect(phoneLocale()).toBe('ar');
  jest.mocked(getLocales).mockReturnValue([] as unknown as ReturnType<typeof getLocales>);
  expect(phoneLocale()).toBe('ar');
  phone('ltr', 'fr-FR');
  expect(phoneLocale()).toBe('en');
});
