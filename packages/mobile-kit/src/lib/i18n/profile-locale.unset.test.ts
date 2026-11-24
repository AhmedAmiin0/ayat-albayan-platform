import { LOCALE_STORAGE_KEY } from '@ab/core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiSend } from '../http/api';
import { setLocale } from './locale-switch';
import { followProfileLocale } from './profile-locale';

// A login that never chose a language (profiles.locale null) learns this phone's saved choice,
// once per run; nothing saved (the phone's own language) leaves it unset. Never a switch.
// One module for the file, as one run: the cases follow each other in order.
jest.mock('./locale-switch', () => ({ setLocale: jest.fn(async () => 'reloading') }));
jest.mock('../http/api', () => ({ apiFetch: jest.fn(), apiSend: jest.fn() }));

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

test('nothing saved (the phone language): the profile stays unset', async () => {
  expect(await followProfileLocale(null, 'ar')).toBe(false);
  expect(apiSend).not.toHaveBeenCalled();
});

test('a saved choice is PATCHed up once per run (even when it fails), never switched', async () => {
  await AsyncStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  jest.mocked(apiSend).mockRejectedValueOnce(new Error('down'));
  expect(await followProfileLocale(null, 'en')).toBe(false);
  expect(await followProfileLocale(null, 'en')).toBe(false); // a refetch: not again
  expect(apiSend).toHaveBeenCalledTimes(1);
  expect(apiSend).toHaveBeenCalledWith('PATCH', '/me/locale', { locale: 'en' });
  expect(setLocale).not.toHaveBeenCalled();
});
