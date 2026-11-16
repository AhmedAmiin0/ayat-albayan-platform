import { LOCALE_STORAGE_KEY } from '@ab/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

// After sign-in the login's language (GET /auth/me `locale`) wins over the browser's copy.
vi.mock('@/lib/http/supabase', () => ({ supabase: { auth: {} } }));

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
    expect(followProfileLocale(null)).toBe(false);
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
