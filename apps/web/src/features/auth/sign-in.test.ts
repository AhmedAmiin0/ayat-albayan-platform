import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { signIn, signOut } from './sign-in';

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
}));
const apiFetch = vi.hoisted(() => vi.fn());
const reportSession = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({ supabase: { auth } }));
vi.mock('@/lib/api', () => ({ apiFetch }));
vi.mock('./session-activity', () => ({ reportSession }));

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
    expect(reportSession).toHaveBeenCalledWith('login');
  });

  it('shows the Arabic error on bad credentials', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: new Error('Invalid login') });
    const result = await signIn(creds, new QueryClient());
    expect(result).toEqual({ ok: false, error: t.auth.invalidCredentials });
    expect(apiFetch).not.toHaveBeenCalled();
    expect(reportSession).toHaveBeenCalledWith('login-failed');
  });

  it('signs out users without a profile role', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });
    apiFetch.mockResolvedValue({ id: 'u1', email: creds.email, role: null });
    const result = await signIn(creds, new QueryClient());
    expect(result).toEqual({ ok: false, error: t.auth.noRole });
    expect(auth.signOut).toHaveBeenCalled();
  });

  it('signs out and says so when the account is disabled (403 account_disabled)', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });
    apiFetch.mockRejectedValue(Object.assign(new Error('API 403'), { status: 403, body: { code: 'account_disabled' } }));
    const result = await signIn(creds, new QueryClient());
    expect(result).toEqual({ ok: false, error: t.users.errors.account_disabled });
    expect(auth.signOut).toHaveBeenCalled();
  });

  it('lets any other API failure through', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });
    apiFetch.mockRejectedValue(Object.assign(new Error('API 500'), { status: 500, body: null }));
    await expect(signIn(creds, new QueryClient())).rejects.toThrow('API 500');
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it('reports the sign-out before the token is dropped («سجل النشاط»)', async () => {
    const order: string[] = [];
    reportSession.mockImplementation(async () => void order.push('report'));
    auth.signOut.mockImplementation(async () => void order.push('signOut'));
    await signOut(new QueryClient());
    expect(reportSession).toHaveBeenCalledWith('logout');
    expect(order).toEqual(['report', 'signOut']);
  });
});
