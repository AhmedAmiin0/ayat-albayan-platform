// node tools/scripts/seed-test-account.mjs [--remove] [--allow-remote-staging]
// Owner's test teacher (2026-10-05): a sign-in account with role teacher, its teachers row (DEMO),
// and a DEMO guardian + student assigned to it. Idempotent: re-runs update the same rows and reset
// the password. --remove deletes exactly these rows and the login (also idempotent).
// Env: TEST_TEACHER_EMAIL, TEST_ACCOUNT_PASSWORD (create only, ≥ 10 chars), DATABASE_URL (or PGHOST/
// PGUSER/PGPASSWORD), optional SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (Admin API instead of SQL).
// Refuses anything but a local DB, or STAGING with --allow-remote-staging (allowedTarget).
// Prints ids and counts only: never the email, the password or a phone (public Actions logs).
import postgres from 'postgres';
import { allowedTarget } from './clear-demo.plan.mjs';
import {
  deleteAccount,
  findAccount,
  upsertTeacherProfile,
  upsertViaAdminApi,
  upsertViaSql,
} from './seed-test-account.auth.mjs';
import { TEST_TEACHER } from './seed-test-account.data.mjs';
import {
  authMode,
  databaseUrl,
  parseOptions,
  readCredentials,
  sslFor,
} from './seed-test-account.plan.mjs';
import { deleteRows, upsertFamily, upsertTeacher } from './seed-test-account.rows.mjs';

const { remove } = parseOptions(process.argv);
const creds = readCredentials(process.env, { remove });
const url = databaseUrl(process.env);
if (!allowedTarget(url, process.argv)) {
  throw new Error('refusing a non-local DB (staging needs --allow-remote-staging)');
}
const mode = authMode(process.env);
const ctx =
  mode === 'admin-api'
    ? { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY }
    : null;
const sql = postgres(url, { max: 1, ssl: sslFor(url), onnotice: () => undefined });

const NOT_OURS =
  'an account with TEST_TEACHER_EMAIL already exists and was not created by this script; ' +
  'choose another email (nothing changed)';

async function create() {
  const existing = await findAccount(sql, creds.email);
  if (existing && !existing.ours) throw new Error(NOT_OURS);
  const userId =
    mode === 'admin-api'
      ? await upsertViaAdminApi(ctx, { creds, existing })
      : await sql.begin((tx) => upsertViaSql(tx, { creds, existing }));
  const ids = await sql.begin(async (tx) => {
    await upsertTeacherProfile(tx, { id: userId, fullName: TEST_TEACHER.ar });
    const teacherId = await upsertTeacher(tx, userId);
    const family = await upsertFamily(tx, teacherId);
    return { teacherId, ...family };
  });
  console.log(`test teacher ready (account via ${mode}, ${existing ? 'updated' : 'created'})`);
  console.log(`  user id:    ${userId}`);
  console.log(`  teacher id: ${ids.teacherId}`);
  console.log(
    `  student id: ${ids.student.id} (${ids.student.code}), guardian id: ${ids.guardianId}`,
  );
  console.log(
    '  rows: 1 login (role teacher), 1 teacher, 5 availability slots, 1 guardian, 1 student',
  );
}

async function removeAll() {
  const existing = await findAccount(sql, creds.email);
  if (existing && !existing.ours) throw new Error(NOT_OURS);
  const counts = await sql.begin((tx) => deleteRows(tx));
  if (existing) await deleteAccount(sql, { ctx, id: existing.id });
  const rows = Object.entries(counts).map(([t, n]) => `${t}=${n}`);
  console.log(`test account removed: ${[...rows, `logins=${existing ? 1 : 0}`].join(', ')}`);
}

try {
  await (remove ? removeAll() : create());
} catch (e) {
  // Postgres / Admin API messages name tables and codes, not the email or password.
  console.error(`seed-test-account failed: ${e instanceof Error ? e.message : 'unknown error'}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
