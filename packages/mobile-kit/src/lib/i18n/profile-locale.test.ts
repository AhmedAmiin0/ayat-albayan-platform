import { LOCALE_STORAGE_KEY } from '@ab/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { accessToken } from '../http/access-token';
import { apiSend } from '../http/api';
import { setLocale } from './locale-switch';
import { chooseLocale, followProfileLocale } from './profile-locale';

// The login's language (profiles.locale) wins after sign-in; the setting writes it first.
jest.mock('./locale-switch', () => ({ setLocale: jest.fn(async () => 'reloading') }));
jest.mock('../http/access-token', () => ({ accessToken: jest.fn(async () => null) }));
jest.mock('../http/api', () => ({ apiFetch: jest.fn(), apiSend: jest.fn() }));

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('followProfileLocale', () => {
  it('switches (save, reload) when the profile says another language', async () => {
    expect(await followProfileLocale('en', 'ar')).toBe(true);
    expect(setLocale).toHaveBeenCalledWith('en');
  });

  it('nothing to do: no answer yet (older API), or the run already shows it', async () => {
    expect(await followProfileLocale(undefined, 'ar')).toBe(false);
    expect(await followProfileLocale('ar', 'ar')).toBe(false);
    expect(setLocale).not.toHaveBeenCalled();
  });

  it('the cache already holds it (the gate tried it this run): no second reload, no loop', async () => {
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    expect(await followProfileLocale('en', 'ar')).toBe(false);
    expect(setLocale).not.toHaveBeenCalled();
  });

  it('a reload that failed reads as not reloading', async () => {
    jest.mocked(setLocale).mockResolvedValueOnce('restart');
    expect(await followProfileLocale('en', 'ar')).toBe(false);
  });
});

describe('chooseLocale («اللغة»)', () => {
  it('signed out (a sign-in screen): no profile to write, switches at once', async () => {
    expect(await chooseLocale('en')).toBe('reloading');
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('signed in: PATCH /me/locale first, then the switch', async () => {
    jest.mocked(accessToken).mockResolvedValueOnce('tok');
    jest.mocked(apiSend).mockResolvedValueOnce({ locale: 'en' });
    expect(await chooseLocale('en')).toBe('reloading');
    expect(apiSend).toHaveBeenCalledWith('PATCH', '/me/locale', { locale: 'en' });
    expect(setLocale).toHaveBeenCalledWith('en');
  });

  it('a profile that could not be written changes nothing (the next /auth/me would undo it)', async () => {
    jest.mocked(accessToken).mockResolvedValueOnce('tok');
    jest.mocked(apiSend).mockRejectedValueOnce(new Error('down'));
    expect(await chooseLocale('en')).toBe('error');
    expect(setLocale).not.toHaveBeenCalled();
  });
});
