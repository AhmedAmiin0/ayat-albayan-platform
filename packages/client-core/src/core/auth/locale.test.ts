import { describe, expect, it, vi } from 'vitest';
import { meLocaleOf, meLocalePath, meLocaleSend } from './locale.js';

const client = (answer: unknown) => ({
  apiFetch: vi.fn(),
  apiSend: vi.fn().mockResolvedValue(answer),
});

describe('meLocaleOf', () => {
  it('reads the language of /auth/me or /portal/me', () => {
    expect(meLocaleOf({ id: 'u', locale: 'en' })).toBe('en');
    expect(meLocaleOf({ kind: 'guardian', students: [], locale: 'ar' })).toBe('ar');
  });

  it('is null while loading, from an older API, or for an unknown language', () => {
    expect(meLocaleOf(undefined)).toBeNull();
    expect(meLocaleOf({ id: 'u' })).toBeNull();
    expect(meLocaleOf({ locale: 'fr' })).toBeNull();
  });
});

describe('meLocaleSend', () => {
  it('PATCHes /me/locale with the language and answers the stored one', async () => {
    const c = client({ locale: 'en' });
    await expect(meLocaleSend(c)('en')).resolves.toBe('en');
    expect(c.apiSend).toHaveBeenCalledWith('PATCH', meLocalePath, { locale: 'en' });
  });

  it('refuses an answer that is not a language', async () => {
    await expect(meLocaleSend(client({ ok: true }))('ar')).rejects.toThrow();
  });
});
