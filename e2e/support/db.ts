import type { UserRole } from '@ab/shared';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} missing — run \`pnpm env:local\``);
  return value;
}

/** Wipes every public table and all auth users. Local/CI database only (R-NFR-04). */
export async function resetDb(): Promise<void> {
  const url = env('DATABASE_URL');
  if (!/127\.0\.0\.1|localhost/.test(url)) throw new Error(`refusing to reset non-local DB: ${url}`);
  const sql = postgres(url, { max: 1, onnotice: () => undefined });
  try {
    const rows = await sql<{ t: string }[]>`
      select format('%I.%I', schemaname, tablename) as t from pg_tables where schemaname = 'public'`;
    if (rows.length) await sql.unsafe(`truncate ${rows.map((r) => r.t).join(', ')} restart identity cascade`);
    await sql`delete from auth.users`;
  } finally {
    await sql.end();
  }
}

/**
 * A fresh SAR→USD rate (the 3.75 peg, as the API publishes it) so USD quotes never call the
 * live currency API during e2e (docs/08 §4: a rate fetched < 24 h ago is reused).
 */
export async function seedFxRate(): Promise<void> {
  const sql = postgres(env('DATABASE_URL'), { max: 1, onnotice: () => undefined });
  try {
    await sql`
      insert into public.fx_rates (base, quote, rate, provider, provider_updated_at)
      values ('SAR', 'USD', 0.266667, 'e2e', now())`;
  } finally {
    await sql.end();
  }
}

export interface SeedUser {
  email: string;
  password: string;
  role: UserRole;
  fullName: string;
}

/** Creates a confirmed auth user plus its profile (role ends up in the JWT via the hook). */
export async function seedUser(user: SeedUser): Promise<string> {
  const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
  const { data, error } = await admin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
  });
  if (error) throw error;
  const { error: profileError } = await admin
    .from('profiles')
    .insert({ id: data.user.id, role: user.role, full_name: user.fullName });
  if (profileError) throw profileError;
  return data.user.id;
}
