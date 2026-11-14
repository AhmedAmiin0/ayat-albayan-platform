import { QueryClient } from '@tanstack/react-query';
import { isRedirect } from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';
import { meQuery, requireRole, type Me } from '@/features/people/auth/me';
import { requireTeacherPortal } from './setup-guards';

vi.mock('@/lib/http/supabase', () => ({ supabase: { auth: { getSession: vi.fn() } } }));

// owner 2026-11-14: the teacher's report link is the signed-in page; the guard carries it through
// /login (and /account-setup) as ?redirect= so she lands on it after signing in.

const BACK = '/teacher/report/0b9f3c2e-1a2b-4c3d-8e4f-5a6b7c8d9e0f';
const teacher = (email: string): Me => ({ id: 'u1', email, role: 'teacher', permissions: [] });

function clientWith(me: Me | null): QueryClient {
  const client = new QueryClient();
  client.setQueryData(meQuery.queryKey, me);
  return client;
}

const bounce = async (p: Promise<unknown>) => {
  const thrown: unknown = await p.then(
    () => null,
    (e: unknown) => e,
  );
  return isRedirect(thrown) ? { to: thrown.options.to, search: thrown.options.search } : null;
};

describe('the guard carries the page asked for', () => {
  it('signed out: /login?redirect=<the page>', async () => {
    expect(await bounce(requireTeacherPortal(clientWith(null), BACK))).toEqual({
      to: '/login',
      search: { redirect: BACK },
    });
  });

  it('a code-made login: /account-setup?redirect=<the page>', async () => {
    const client = clientWith(teacher('t-1@family.invalid'));
    expect(await bounce(requireTeacherPortal(client, BACK))).toEqual({
      to: '/account-setup',
      search: { redirect: BACK },
    });
  });

  it('an unsafe page is dropped', async () => {
    expect(await bounce(requireTeacherPortal(clientWith(null), '//evil.example'))).toEqual({
      to: '/login',
      search: {},
    });
  });

  it('other guards (no page) and a signed-in wrong role: plain /login, as before', async () => {
    expect(await bounce(requireRole(clientWith(null), 'admin'))).toEqual({
      to: '/login',
      search: {},
    });
    const admin: Me = { id: 'a1', email: 'a@example.com', role: 'admin', permissions: [] };
    expect(await bounce(requireTeacherPortal(clientWith(admin), BACK))).toEqual({
      to: '/login',
      search: {},
    });
  });
});
