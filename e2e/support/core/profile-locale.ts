import postgres from 'postgres';

// «اللغة» lives on the login (profiles.locale) and an unset one learns the browser's saved choice.
// The journeys share one login per role and pick their language per page (localStorage), so each
// page starts from a login that never chose: one spec's English must not follow the next one.

/** Clears the saved language of the login with this email (local/CI database only). */
export async function forgetProfileLocale(email: string): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing — run `pnpm env:local`');
  const sql = postgres(url, { max: 1, onnotice: () => undefined });
  try {
    await sql`
      update public.profiles set locale = null
      where id = (select id from auth.users where email = ${email})`;
  } finally {
    await sql.end();
  }
}
