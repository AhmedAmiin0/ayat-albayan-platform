import { QueryClient } from '@tanstack/react-query';
import { isRedirect } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { home } from '@ab/web-kit/portal/portal.fixtures';
import { requireFamily, requireTab } from './guard';

const signOut = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('@ab/web-kit/auth/sign-in', () => ({ signOut }));

const ME_KEY = ['me'];
vi.mock('@ab/web-kit/auth/me', () => ({
  meQuery: { queryKey: ['me'], queryFn: () => null },
  isAccountDisabled: () => false,
}));
vi.mock('@ab/web-kit/portal/api', () => ({
  portalHomeQuery: { queryKey: ['portal-me'], queryFn: () => null },
}));

const withMe = (role: string | null) => {
  const client = new QueryClient();
  client.setQueryData(ME_KEY, role ? { id: 'u1', role, permissions: [] } : null);
  return client;
};

const thrown = async (work: Promise<unknown>) => work.then(() => null, (e: unknown) => e);

beforeEach(() => signOut.mockClear());

describe('requireFamily (docs/51 §3)', () => {
  it('signed out → /login carrying the page asked for', async () => {
    const error = await thrown(requireFamily(withMe(null), '/schedule'));
    expect(isRedirect(error)).toBe(true);
    expect(signOut).not.toHaveBeenCalled();
  });

  it('a guardian or a student is a family visitor', async () => {
    await expect(requireFamily(withMe('guardian'), '/portal')).resolves.toBe('family');
    await expect(requireFamily(withMe('student'), '/portal')).resolves.toBe('family');
  });

  it('a staff login is signed out and gets «wrongApp»', async () => {
    await expect(requireFamily(withMe('teacher'), '/portal')).resolves.toBe('staff');
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});

describe('requireTab: a tab the login lacks goes home', () => {
  const guard = (kind: 'guardian' | 'student') => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['portal-me'], home({ kind }));
    return { queryClient, visitor: 'family' as const };
  };

  it('«أبنائي» is a guardian’s, «التقارير» a student’s', async () => {
    await expect(requireTab(guard('guardian'), 'children')).resolves.toBeUndefined();
    expect(isRedirect(await thrown(requireTab(guard('student'), 'children')))).toBe(true);
    expect(isRedirect(await thrown(requireTab(guard('guardian'), 'reports')))).toBe(true);
  });

  it('a staff visitor reads no portal (the notice shows instead)', async () => {
    const queryClient = new QueryClient();
    await expect(requireTab({ queryClient, visitor: 'staff' }, 'children')).resolves.toBeUndefined();
  });
});
