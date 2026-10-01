import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { signIn } from './sign-in';

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
}));
const apiFetch = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({ supabase: { auth } }));
vi.mock('@/lib/api', () => ({ apiFetch }));

const creds = { email: 'admin@ab.local', password: 'secret-123' };

describe('signIn (R-AUTH-01)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    auth.getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
  });

  it('returns the role home on success', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });
    apiFetch.mockResolvedValue({ id: 'u1', email: creds.email, role: 'teacher' });
    await expect(signIn(creds, new QueryClient())).resolves.toEqual({ ok: true, home: '/teacher' });
  });

  it('shows the Arabic error on bad credentials', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: new Error('Invalid login') });
    const result = await signIn(creds, new QueryClient());
    expect(result).toEqual({ ok: false, error: t.auth.invalidCredentials });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('signs out users without a profile role', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });
    apiFetch.mockResolvedValue({ id: 'u1', email: creds.email, role: null });
    const result = await signIn(creds, new QueryClient());
    expect(result).toEqual({ ok: false, error: t.auth.noRole });
    expect(auth.signOut).toHaveBeenCalled();
  });
});
