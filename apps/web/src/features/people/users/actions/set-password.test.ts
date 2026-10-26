import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { hasRecoverySession, savePassword, setPasswordError } from './set-password';

const auth = vi.hoisted(() => ({ getSession: vi.fn(), updateUser: vi.fn() }));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/supabase', () => ({ supabase: { auth } }));
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/features/people/auth/session-activity', () => ({ reportSession: vi.fn() }));

describe('set-password', () => {
  beforeEach(() => {
    auth.getSession.mockReset().mockResolvedValue({ data: { session: { access_token: 'x' } } });
    auth.updateUser.mockReset();
    apiFetch.mockReset();
  });

  it('checks both typed passwords', () => {
    expect(setPasswordError('', '')).toBe(t.users.validation.passwordBlank);
    expect(setPasswordError('short', 'short')).toContain('8');
    expect(setPasswordError('long-enough-1', 'long-enough-2')).toBe(t.users.validation.mismatch);
    expect(setPasswordError('long-enough-1', 'long-enough-1')).toBeUndefined();
  });

  it('needs a recovery session from the link', async () => {
    expect(await hasRecoverySession()).toBe(true);
    auth.getSession.mockResolvedValue({ data: { session: null } });
    expect(await hasRecoverySession()).toBe(false);
  });

  it('saves the password and returns the role home', async () => {
    auth.updateUser.mockResolvedValue({ error: null });
    apiFetch.mockResolvedValue({ id: 'u', email: null, role: 'student', permissions: [] });
    const result = await savePassword('long-enough-1', new QueryClient());
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'long-enough-1' });
    expect(result).toMatchObject({ ok: true });
  });

  it('reports a refused update', async () => {
    auth.updateUser.mockResolvedValue({ error: new Error('expired') });
    expect(await savePassword('long-enough-1', new QueryClient())).toEqual({ ok: false, error: t.users.setPassword.failed });
  });
});
