import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../db/db.module';
import { authEmailOf, createAuthUser } from './auth-users';

const fail = (e: { code?: string | undefined }) => new Error(`mapped ${e.code ?? ''}`);

function db(result: { data: unknown; error: unknown }) {
  const createUser = vi.fn().mockResolvedValue(result);
  const getUserById = vi.fn().mockResolvedValue(result);
  return { db: { auth: { admin: { createUser, getUserById } } } as unknown as Db, createUser, getUserById };
}

describe('Auth Admin helpers', () => {
  it('creates a confirmed login, with the password only when given', async () => {
    const d = db({ data: { user: { id: 'u1' } }, error: null });
    await expect(createAuthUser(d.db, { email: 'a@b.co', fullName: 'س' }, fail)).resolves.toBe('u1');
    expect(d.createUser).toHaveBeenCalledWith({ email: 'a@b.co', email_confirm: true, user_metadata: { full_name: 'س' } });
    await createAuthUser(d.db, { email: 'a@b.co', password: 'p', fullName: 'س' }, fail);
    expect(d.createUser).toHaveBeenLastCalledWith(expect.objectContaining({ password: 'p' }));
  });

  it('maps failures with the caller\'s mapper', async () => {
    const d = db({ data: null, error: { code: 'email_exists', message: 'x' } });
    await expect(createAuthUser(d.db, { email: 'a@b.co', fullName: 'س' }, fail)).rejects.toThrow('mapped email_exists');
    await expect(authEmailOf(d.db, 'u1', fail)).rejects.toThrow('mapped email_exists');
  });

  it('reads the email, null when the login has none', async () => {
    await expect(authEmailOf(db({ data: { user: { email: 'a@b.co' } }, error: null }).db, 'u1', fail)).resolves.toBe('a@b.co');
    await expect(authEmailOf(db({ data: { user: {} }, error: null }).db, 'u1', fail)).resolves.toBeNull();
  });
});
