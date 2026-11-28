import { describe, expect, it, vi } from 'vitest';
import { meLocaleOf, meLocaleSend } from './locale';

const client = (answer: unknown) => ({
  apiFetch: vi.fn(),
  apiSend: vi.fn().mockResolvedValue(answer),
});

describe('meLocaleOf', () => {
  it('reads the language of /auth/me or /portal/me', () => {
    expect(meLocaleOf({ id: 'u', locale: 'en' })).toBe('en');
    expect(meLocaleOf({ kind: 'guardian', students: [], locale: 'ar' })).toBe('ar');
  });

  it('is null when the login never chose a language', () => {
    expect(meLocaleOf({ id: 'u', locale: null })).toBeNull();
  });

  it('is undefined while loading, from an older API, or for an unknown language', () => {
    expect(meLocaleOf(undefined)).toBeUndefined();
    expect(meLocaleOf({ id: 'u' })).toBeUndefined();
    expect(meLocaleOf({ locale: 'fr' })).toBeUndefined();
  });
});

describe('meLocaleSend', () => {
  it('PATCHes /me/locale with the language and answers the stored one', async () => {
    const c = client({ locale: 'en' });
    await expect(meLocaleSend(c)('en')).resolves.toBe('en');
    expect(c.apiSend).toHaveBeenCalledWith('PATCH', '/me/locale', { locale: 'en' });
  });

  it('refuses an answer that is not a language', async () => {
    await expect(meLocaleSend(client({ ok: true }))('ar')).rejects.toThrow();
  });
});
