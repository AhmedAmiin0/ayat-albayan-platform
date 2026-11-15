import { cloneBundle } from '@ab/shared';
import ar from '@ab/shared/i18n/ar.json';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type * as Module from './i18n-overrides';

jest.mock('../http/env', () => ({ env: { apiUrl: 'http://api' } }));

// jest.setup turns refreshOverrides off for the flow tests; this file tests the real module.
const { cacheKey, fetchOverrides, OVERRIDES_TIMEOUT_MS, refreshOverrides, restoreCachedOverrides } =
  jest.requireActual<typeof Module>('./i18n-overrides');

const json = (body: unknown, status = 200) => ({ ok: status < 300, status, json: async () => body });
const fetchMock = jest.fn();

beforeEach(async () => {
  await AsyncStorage.clear();
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});
afterEach(() => jest.useRealTimers());

describe('translation overrides on the phone', () => {
  it('`t` is a copy of the bundle', () => {
    const { t } = jest.requireActual<{ t: typeof ar }>('./i18n');
    expect(t).toEqual(ar);
    expect(t).not.toBe(ar);
  });

  it('applies the overrides the last run saved; nothing saved or junk saved changes nothing', async () => {
    const target = cloneBundle(ar);
    expect(await restoreCachedOverrides(target, 'ar')).toBe(0);
    await AsyncStorage.setItem(cacheKey('ar'), 'not json');
    expect(await restoreCachedOverrides(target, 'ar')).toBe(0);
    await AsyncStorage.setItem(cacheKey('ar'), JSON.stringify({ 'nav.leads': 'قائمة' }));
    expect(await restoreCachedOverrides(target, 'ar')).toBe(1);
    expect(target.nav.leads).toBe('قائمة');
  });

  it('refresh fetches, applies and saves the map for the next start', async () => {
    fetchMock.mockResolvedValue(json({ 'nav.inbox': 'الرسائل' }));
    const target = cloneBundle(ar);
    expect(await refreshOverrides(target, 'ar')).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('http://api/i18n/ar/overrides', expect.anything());
    expect(target.nav.inbox).toBe('الرسائل');
    expect(JSON.parse((await AsyncStorage.getItem(cacheKey('ar'))) ?? '{}')).toEqual({ 'nav.inbox': 'الرسائل' });
  });

  it('a failed or malformed response keeps the saved map', async () => {
    await AsyncStorage.setItem(cacheKey('en'), '{"nav.leads":"Prospects"}');
    fetchMock.mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(json({}, 503)).mockResolvedValueOnce(json([1]));
    for (let i = 0; i < 3; i += 1) expect(await refreshOverrides(cloneBundle(ar), 'en')).toBe(false);
    expect(await AsyncStorage.getItem(cacheKey('en'))).toBe('{"nav.leads":"Prospects"}');
  });

  it('gives up after the timeout', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')))),
    );
    const pending = fetchOverrides('http://api', 'ar');
    jest.advanceTimersByTime(OVERRIDES_TIMEOUT_MS);
    await expect(pending).resolves.toBeNull();
  });
});
