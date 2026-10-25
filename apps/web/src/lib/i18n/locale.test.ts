import { LOCALE_STORAGE_KEY } from '@ab/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

// `locale` is read when the module loads, so every case imports a fresh copy.
async function freshLocale() {
  vi.resetModules();
  return import('./locale');
}

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('locale (read once at boot)', () => {
  it('is Arabic when nothing is saved', async () => {
    expect((await freshLocale()).locale).toBe('ar');
  });

  it('is English when English is saved', async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    expect((await freshLocale()).locale).toBe('en');
  });

  it('is Arabic for an unknown saved value', async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'fr');
    expect((await freshLocale()).locale).toBe('ar');
  });

  it('is Arabic when storage throws (blocked / private mode)', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect((await freshLocale()).locale).toBe('ar');
  });
});

describe('setLocale', () => {
  it('saves the choice and reloads', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...location, reload });
    const { setLocale } = await freshLocale();
    setLocale('en');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en');
    expect(reload).toHaveBeenCalledOnce();
  });

  it('still reloads when storage throws', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...location, reload });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { setLocale } = await freshLocale();
    expect(() => setLocale('en')).not.toThrow();
    expect(reload).toHaveBeenCalledOnce();
  });
});
