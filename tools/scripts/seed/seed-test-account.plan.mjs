// Pure helpers for tools/scripts/seed-test-account.mjs (no I/O). Error messages name the missing
// variable, never its value: the staging workflow's log is public while the repo is.
import { TEST_ACCOUNT_MARKER } from './seed-test-account.data.mjs';

const LOCAL_HOSTS = ['127.0.0.1', 'localhost', '[::1]'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD = 10;

/** `--remove` deletes the test rows and the login; anything else creates/updates them. */
export function parseOptions(argv) {
  return { remove: argv.includes('--remove') };
}

/** The teacher login's email + password from env; both required (the password only to create). */
export function readCredentials(env, { remove } = { remove: false }) {
  const email = (env.TEST_TEACHER_EMAIL ?? '').trim().toLowerCase();
  if (!email) throw new Error('TEST_TEACHER_EMAIL missing');
  if (!EMAIL.test(email)) throw new Error('TEST_TEACHER_EMAIL is not an email address');
  if (remove) return { email, password: null };
  const password = env.TEST_ACCOUNT_PASSWORD ?? '';
  if (!password) throw new Error('TEST_ACCOUNT_PASSWORD missing');
  if (password.length < MIN_PASSWORD) {
    throw new Error(`TEST_ACCOUNT_PASSWORD must be at least ${MIN_PASSWORD} characters`);
  }
  return { email, password };
}

/**
 * DATABASE_URL, or one built from the libpq variables the staging workflows set (PGHOST, PGUSER,
 * PGPASSWORD …). The password is URL-encoded so a special character cannot break the URL.
 */
export function databaseUrl(env) {
  if (env.DATABASE_URL) return env.DATABASE_URL;
  if (!env.PGHOST || !env.PGUSER || !env.PGPASSWORD) {
    throw new Error('DATABASE_URL missing (or PGHOST + PGUSER + PGPASSWORD)');
  }
  const user = encodeURIComponent(env.PGUSER);
  const auth = `${user}:${encodeURIComponent(env.PGPASSWORD)}`;
  return `postgresql://${auth}@${env.PGHOST}:${env.PGPORT || '5432'}/${env.PGDATABASE || 'postgres'}`;
}

/** TLS for every hosted database; the local Supabase stack has none. */
export function sslFor(url) {
  return LOCAL_HOSTS.includes(new URL(url).hostname) ? false : 'require';
}

/** Supabase Admin API when the service-role key is given, else SQL (auth.users + identities). */
export function authMode(env) {
  return env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY ? 'admin-api' : 'sql';
}

/** user_metadata stamped on the login this script creates. */
export const accountMetadata = () => ({ test_account: TEST_ACCOUNT_MARKER });

/** True only for a login this script made (a real account with the same email is never touched). */
export function isTestAccount(meta) {
  return meta !== null && typeof meta === 'object' && meta.test_account === TEST_ACCOUNT_MARKER;
}

/** Admin API endpoint for one user, or the collection. */
export function adminUsersUrl(base, id) {
  const root = `${base.replace(/\/+$/, '')}/auth/v1/admin/users`;
  return id ? `${root}/${encodeURIComponent(id)}` : root;
}
