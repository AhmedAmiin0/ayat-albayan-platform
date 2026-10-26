import type { Db } from '../db/db.module';

/** A GoTrue Admin API failure as supabase-js reports it. */
interface AuthFailure {
  code?: string | undefined;
  message: string;
}

type Fail = (error: AuthFailure) => Error;

/**
 * A login through the Auth Admin API with its email already confirmed (no SMTP is configured); the
 * password only when one is given. Each caller maps GoTrue's failures to its own codes.
 */
export async function createAuthUser(db: Db, input: { email: string; password?: string | undefined; fullName: string }, fail: Fail): Promise<string> {
  const { data, error } = await db.auth.admin.createUser({
    email: input.email,
    ...(input.password && { password: input.password }),
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (error) throw fail(error);
  return data.user.id;
}

/** The login's email (null when it has none). */
export async function authEmailOf(db: Db, id: string, fail: Fail): Promise<string | null> {
  const { data, error } = await db.auth.admin.getUserById(id);
  if (error) throw fail(error);
  return data.user.email ?? null;
}
