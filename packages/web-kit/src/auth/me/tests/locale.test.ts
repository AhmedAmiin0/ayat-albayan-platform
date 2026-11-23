import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { followProfileLocale } from '#/lib/i18n/profile-locale.ts';
import { meQuery } from '#/auth/me/me.ts';

// Staff pages and the family portal alike pass through GET /auth/me: its `locale` is followed.
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('#/lib/http/supabase.ts', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } },
}));
vi.mock('#/lib/http/api/api.ts', () => ({ apiFetch }));
vi.mock('#/lib/i18n/profile-locale.ts', () => ({ followProfileLocale: vi.fn(() => false) }));

beforeEach(() => vi.clearAllMocks());

describe('meQuery and the login language', () => {
  it('follows the answer’s locale', async () => {
    apiFetch.mockResolvedValue({ id: 'u1', role: 'guardian', permissions: [], locale: 'en' });
    await new QueryClient().query(meQuery);
    expect(followProfileLocale).toHaveBeenCalledWith('en');
  });

  it('an answer without a valid locale (an older API) follows nothing', async () => {
    apiFetch.mockResolvedValue({ id: 'u1', role: 'admin', permissions: [], locale: 'fr' });
    await new QueryClient().query(meQuery);
    expect(followProfileLocale).toHaveBeenCalledWith(undefined);
  });

  it('a login that never chose: null (it learns this browser’s choice)', async () => {
    apiFetch.mockResolvedValue({ id: 'u1', role: 'admin', permissions: [], locale: null });
    await new QueryClient().query(meQuery);
    expect(followProfileLocale).toHaveBeenCalledWith(null);
  });
});
