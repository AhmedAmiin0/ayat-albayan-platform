import type { Permission } from '@ab/shared';
import { QueryClient } from '@tanstack/react-query';
import { isRedirect } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { guardAdmin } from './admin-guard';

const auth = vi.hoisted(() => ({ signOut: vi.fn(), getSession: vi.fn(), storageKey: 'sb-test-auth-token' }));
const apiFetch = vi.hoisted(() => vi.fn());
const reportSession = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('@/lib/supabase', () => ({ supabase: { auth } }));
vi.mock('@/lib/api', () => ({ apiFetch }));
vi.mock('./session-activity', () => ({ reportSession }));
vi.mock('@/features/notifications/web-push', () => ({ forgetWebPush: vi.fn(async () => undefined) }));

function signedInAs(...permissions: Permission[]): QueryClient {
  apiFetch.mockResolvedValue({ id: 'u1', email: 'a@ab.local', role: 'admin', permissions });
  return new QueryClient();
}

/** The redirect target guardAdmin threw, or 'none' when the page was let through. */
async function outcome(queryClient: QueryClient, pathname: string): Promise<string> {
  try {
    await guardAdmin(queryClient, pathname);
    return 'none';
  } catch (error) {
    if (isRedirect(error)) return String(error.options.to);
    throw error;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
  auth.signOut.mockResolvedValue({ error: null });
});

describe('the /admin guard', () => {
  it('lets a permitted page through, signed in', async () => {
    await expect(outcome(signedInAs('payments.read'), '/admin/payments')).resolves.toBe('none');
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it('sends «محاسب» to its first page, still signed in', async () => {
    await expect(outcome(signedInAs('payments.read'), '/admin')).resolves.toBe('/admin/payments');
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it('signs out a base admin with no admin page before sending them to /login (no loop)', async () => {
    const queryClient = signedInAs('templates.manage');
    await expect(outcome(queryClient, '/admin')).resolves.toBe('/login');
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(reportSession).toHaveBeenCalledWith('logout');
    expect(queryClient.getQueryData(['auth', 'me'])).toBeUndefined();
  });

  it('still goes to /login, the stored session removed, when supabase cannot sign out', async () => {
    localStorage.setItem('sb-test-auth-token', '{}');
    auth.signOut.mockResolvedValueOnce({ error: new Error('Failed to fetch') });
    await expect(outcome(signedInAs(), '/admin/students')).resolves.toBe('/login');
    expect(localStorage.getItem('sb-test-auth-token')).toBeNull();
  });

  it('a signed-out visitor goes to /login without a sign-out call', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } });
    await expect(outcome(new QueryClient(), '/admin')).resolves.toBe('/login');
    expect(auth.signOut).not.toHaveBeenCalled();
  });
});
