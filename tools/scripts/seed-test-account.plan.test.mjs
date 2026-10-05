import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allowedTarget, STAGING_REF } from './clear-demo.plan.mjs';
import { DEMO_NOTE } from './seed-demo.data.mjs';
import { TEST_FAMILY, TEST_TEACHER } from './seed-test-account.data.mjs';
import {
  accountMetadata,
  adminUsersUrl,
  authMode,
  databaseUrl,
  isTestAccount,
  parseOptions,
  readCredentials,
  sslFor,
} from './seed-test-account.plan.mjs';

const SECRET = 'S3cret-p@ss/word#1';
const E164 = /^\+[1-9]\d{7,14}$/;
const POOLER = 'aws-1-eu-central-1.pooler.supabase.com';

test('--remove is the only option; create is the default', () => {
  assert.deepEqual(parseOptions(['node', 'x']), { remove: false });
  assert.deepEqual(parseOptions(['node', 'x', '--remove', '--allow-remote-staging']), {
    remove: true,
  });
});

test('credentials: email trimmed + lower-cased, password kept as given', () => {
  const env = { TEST_TEACHER_EMAIL: ' Teacher@Example.COM ', TEST_ACCOUNT_PASSWORD: SECRET };
  assert.deepEqual(readCredentials(env), { email: 'teacher@example.com', password: SECRET });
  assert.deepEqual(readCredentials({ TEST_TEACHER_EMAIL: 'a@b.co' }, { remove: true }), {
    email: 'a@b.co',
    password: null,
  });
});

test('missing or weak credentials fail naming the variable, never echoing a value', () => {
  const cases = [
    [{}, /TEST_TEACHER_EMAIL missing/],
    [{ TEST_TEACHER_EMAIL: 'not-an-email' }, /not an email/],
    [{ TEST_TEACHER_EMAIL: 'a@b.co' }, /TEST_ACCOUNT_PASSWORD missing/],
    [{ TEST_TEACHER_EMAIL: 'a@b.co', TEST_ACCOUNT_PASSWORD: 'short-pw1' }, /at least 10/],
  ];
  for (const [env, msg] of cases) {
    assert.throws(
      () => readCredentials(env),
      (e) =>
        msg.test(e.message) && !e.message.includes('short-pw1') && !e.message.includes('a@b.co'),
    );
  }
});

test('database URL: DATABASE_URL wins; otherwise built from PG* with the password encoded', () => {
  assert.equal(
    databaseUrl({ DATABASE_URL: 'postgresql://x@127.0.0.1/db', PGHOST: 'h' }),
    'postgresql://x@127.0.0.1/db',
  );
  const url = databaseUrl({
    PGHOST: POOLER,
    PGUSER: `postgres.${STAGING_REF}`,
    PGPASSWORD: SECRET,
  });
  const u = new URL(url);
  assert.equal(decodeURIComponent(u.password), SECRET);
  assert.equal(u.hostname, POOLER);
  assert.equal(u.port, '5432');
  assert.equal(u.pathname, '/postgres');
  assert.equal(allowedTarget(url, ['--allow-remote-staging']), true);
  assert.equal(allowedTarget(url, []), false);
  assert.throws(() => databaseUrl({ PGHOST: POOLER }), /DATABASE_URL missing/);
});

test('TLS for hosted databases only', () => {
  assert.equal(sslFor('postgresql://postgres:postgres@127.0.0.1:54322/postgres'), false);
  assert.equal(sslFor('postgresql://u:p@localhost/db'), false);
  assert.equal(sslFor(`postgresql://u:p@${POOLER}:5432/postgres`), 'require');
});

test('Admin API only when both the URL and the service-role key are set', () => {
  assert.equal(authMode({}), 'sql');
  assert.equal(authMode({ SUPABASE_URL: 'https://x.supabase.co' }), 'sql');
  assert.equal(authMode({ SUPABASE_SERVICE_ROLE_KEY: 'k' }), 'sql');
  assert.equal(
    authMode({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' }),
    'admin-api',
  );
});

test('only a login stamped by this script counts as the test account', () => {
  assert.equal(isTestAccount(accountMetadata()), true);
  assert.equal(isTestAccount({ ...accountMetadata(), email_verified: true }), true);
  for (const meta of [null, undefined, {}, { test_account: 'other' }, 'seed-test-account']) {
    assert.equal(isTestAccount(meta), false);
  }
});

test('admin users endpoint', () => {
  assert.equal(
    adminUsersUrl('https://x.supabase.co/', undefined),
    'https://x.supabase.co/auth/v1/admin/users',
  );
  assert.equal(
    adminUsersUrl('http://127.0.0.1:54321', 'a b'),
    'http://127.0.0.1:54321/auth/v1/admin/users/a%20b',
  );
});

test('test rows carry the DEMO markers clear:demo matches on, with fake E.164 phones', () => {
  assert.ok(TEST_TEACHER.en.endsWith(' (DEMO)'));
  assert.equal(TEST_FAMILY.note, DEMO_NOTE);
  assert.match(TEST_TEACHER.phone, E164);
  assert.match(TEST_FAMILY.phone, E164);
  assert.notEqual(TEST_TEACHER.phone, TEST_FAMILY.phone);
  assert.deepEqual(TEST_TEACHER.programs, ['quran']);
  assert.equal(TEST_FAMILY.student.program, 'quran');
  assert.equal(TEST_FAMILY.student.status, 'active');
});

test('availability: Sun–Thu 16:00–22:00 in Asia/Riyadh', () => {
  assert.equal(TEST_TEACHER.tz, 'Asia/Riyadh');
  assert.deepEqual(
    TEST_TEACHER.availability.map(([d]) => d),
    [0, 1, 2, 3, 4],
  );
  for (const [, start, end] of TEST_TEACHER.availability) {
    assert.equal(start, '16:00');
    assert.equal(end, '22:00');
  }
});
