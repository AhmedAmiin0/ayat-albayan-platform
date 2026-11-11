import { QueryClient } from '@tanstack/react-query';
import { isRedirect } from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';
import { meQuery, type Me } from '@/features/people/auth/me';
import { requireSetupPending, requireTeacherPortal } from './setup-guards';

vi.mock('@/lib/http/supabase', () => ({ supabase: { auth: { getSession: vi.fn() } } }));

const teacher = (email: string): Me => ({ id: 'u1', email, role: 'teacher', permissions: [] });

function clientWith(me: Me): QueryClient {
  const client = new QueryClient();
  client.setQueryData(meQuery.queryKey, me);
  return client;
}

const targetOf = async (p: Promise<unknown>): Promise<string | null> => {
  const thrown: unknown = await p.then(
    () => null,
    (e: unknown) => e,
  );
  return isRedirect(thrown) ? String(thrown.options.to) : null;
};

describe('the teacher portal waits for setup (docs/46 A4)', () => {
  it('a code-made login goes to /account-setup; a set-up one stays', async () => {
    expect(await targetOf(requireTeacherPortal(clientWith(teacher('t-1@family.invalid'))))).toBe(
      '/account-setup',
    );
    await expect(requireTeacherPortal(clientWith(teacher('t@example.com')))).resolves.toMatchObject(
      { id: 'u1' },
    );
  });

  it('/account-setup is for a pending login only', async () => {
    expect(await targetOf(requireSetupPending(clientWith(teacher('t@example.com'))))).toBe(
      '/teacher',
    );
    await expect(
      requireSetupPending(clientWith(teacher('t-1@family.invalid'))),
    ).resolves.toMatchObject({ id: 'u1' });
  });

  it('any other role is sent to /login', async () => {
    const admin: Me = { id: 'a1', email: 'a@example.com', role: 'admin', permissions: [] };
    expect(await targetOf(requireSetupPending(clientWith(admin)))).toBe('/login');
  });
});
