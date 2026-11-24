import { LOCALE_STORAGE_KEY } from '@ab/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

// After sign-in the login's language (GET /auth/me `locale`) wins over the browser's copy.
vi.mock('@ab/web-kit/lib/http/supabase', () => ({ supabase: { auth: {} } }));
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', () => ({ apiFetch: vi.fn(), apiSend }));

async function fresh() {
  vi.resetModules();
  return import('./profile-locale');
}
const stubReload = () => {
  const reload = vi.fn();
  vi.stubGlobal('location', { reload });
  return reload;
};

afterEach(() => {
  apiSend.mockReset();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('followProfileLocale (this load: Arabic, nothing saved)', () => {
  it('another language: saved, then a reload', async () => {
    const reload = stubReload();
    expect((await fresh()).followProfileLocale('en')).toBe(true);
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en');
    expect(reload).toHaveBeenCalledOnce();
  });

  it('the same language, or no answer (an older API): nothing', async () => {
    const reload = stubReload();
    const { followProfileLocale } = await fresh();
    expect(followProfileLocale('ar')).toBe(false);
    expect(followProfileLocale(undefined)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('storage blocked: no reload (it would come back in Arabic and ask again, forever)', async () => {
    const reload = stubReload();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect((await fresh()).followProfileLocale('en')).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});

describe('followProfileLocale: a login that never chose (null)', () => {
  it('learns this browser’s saved choice once per load, and nothing reloads', async () => {
    const reload = stubReload();
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    apiSend.mockResolvedValue({ locale: 'en' });
    const { followProfileLocale } = await fresh();
    expect(followProfileLocale(null)).toBe(false);
    expect(followProfileLocale(null)).toBe(false); // a refetch: not again
    expect(apiSend).toHaveBeenCalledExactlyOnceWith('PATCH', '/me/locale', { locale: 'en' });
    expect(reload).not.toHaveBeenCalled();
  });

  it('nothing saved: the profile stays unset', async () => {
    const { followProfileLocale } = await fresh();
    expect(followProfileLocale(null)).toBe(false);
    expect(apiSend).not.toHaveBeenCalled();
  });
});
