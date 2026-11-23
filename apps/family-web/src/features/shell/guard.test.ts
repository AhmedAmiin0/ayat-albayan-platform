import { QueryClient } from '@tanstack/react-query';
import { isRedirect } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { home, kid } from '@ab/web-kit/portal/portal.fixtures';
import { requireFamily, requirePicker } from './guard';

const signOut = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('@ab/web-kit/auth/sign-in/sign-in', () => ({ signOut }));

const ME_KEY = ['me'];
vi.mock('@ab/web-kit/auth/me/me', () => ({
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

describe('requirePicker: «اختر الطالب» is a guardian of several children’s', () => {
  const guard = (over: Parameters<typeof home>[0]) => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['portal-me'], home(over));
    return { queryClient, visitor: 'family' as const };
  };

  it('a guardian of two picks; a student or a guardian of one goes home', async () => {
    await expect(requirePicker(guard({ kind: 'guardian' }))).resolves.toBeUndefined();
    expect(isRedirect(await thrown(requirePicker(guard({ kind: 'student' }))))).toBe(true);
    const one = guard({ kind: 'guardian', students: [kid()] });
    expect(isRedirect(await thrown(requirePicker(one)))).toBe(true);
  });

  it('a staff visitor reads no portal (the notice shows instead)', async () => {
    const queryClient = new QueryClient();
    await expect(requirePicker({ queryClient, visitor: 'staff' })).resolves.toBeUndefined();
  });
});
