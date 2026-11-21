// db-backup.yml (docs/backups.md): the nightly encrypted copy of the database outside Supabase.
// Ships switched off: without its secret and public key it ends green with a notice. The steps'
// own scripts run here with a fake pg_dump and age; the URL must never reach the log.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const read = (p) => readFileSync(fileURLToPath(new URL(`../../../${p}`, import.meta.url)), 'utf8');
const doc = parse(read('.github/workflows/db-backup.yml'));
const job = doc.jobs.dump;
const step = (name) => job.steps.find((s) => s.name === name);
const URL_ = 'postgresql://postgres.ref:s3cret-pass@db.example.supabase.co:5432/postgres';

/** Runs one step's script in a temp dir with fakes on PATH; returns its output and outputs. */
function run(name, env, fakes = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'db-backup-'));
  for (const [bin, body] of Object.entries(fakes)) {
    writeFileSync(join(dir, bin), `#!/bin/sh\n${body}\n`);
    chmodSync(join(dir, bin), 0o755);
  }
  const out = join(dir, 'out');
  writeFileSync(out, '');
  const vars = { PATH: `${dir}:${process.env.PATH}`, GITHUB_OUTPUT: out, RUNNER_TEMP: dir, ...env };
  const script = ['-eo', 'pipefail', '-c', step(name).run];
  const result = (() => {
    try {
      return { ok: true, log: execFileSync('bash', script, { env: vars, cwd: dir }).toString() };
    } catch (e) {
      return { ok: false, log: `${e.stdout ?? ''}${e.stderr ?? ''}` };
    }
  })();
  return { ...result, outputs: readFileSync(out, 'utf8'), dir };
}

test('nightly and by hand; read-only; one at a time; bound to its environment', () => {
  assert.ok(doc.on.schedule?.[0]?.cron, 'a nightly schedule');
  assert.ok('workflow_dispatch' in doc.on);
  assert.deepEqual(doc.permissions, { contents: 'read' });
  assert.equal(doc.concurrency['cancel-in-progress'], false);
  assert.equal(job.environment, 'db-backup');
  assert.ok(job['timeout-minutes'] <= 120);
});

test('switched off: no secret or no public key → a notice, green, and every later step skipped', () => {
  for (const env of [{}, { DB_URL: URL_ }, { AGE_RECIPIENT: 'age1abc' }]) {
    const r = run('Check the switch', env);
    assert.equal(r.ok, true);
    assert.match(r.log, /::notice::/);
    assert.match(r.outputs, /^on=false$/m);
    assert.ok(!r.log.includes('s3cret'));
  }
  for (const s of job.steps.slice(1)) assert.match(String(s.if), /steps\.switch\.outputs\.on == 'true'/, s.name);
});

test('both set → on', () => {
  const r = run('Check the switch', { DB_URL: URL_, AGE_RECIPIENT: 'age1abc' });
  assert.match(r.outputs, /^on=true$/m);
});

test('the dump is encrypted on the way out: only the .age file exists, never a plain dump', () => {
  const fakes = { pg_dump: 'printf "PGDMP plain rows"', age: 'shift 2; printf "age-encrypted:"; cat' };
  const r = run('Dump and encrypt', { DB_URL: URL_, AGE_RECIPIENT: 'age1abc', PG_DUMP: 'pg_dump' }, fakes);
  assert.equal(r.ok, true, r.log);
  const files = readdirSync(join(r.dir, 'backup'));
  assert.equal(files.length, 2);
  const dump = files.find((f) => f.endsWith('.dump.age'));
  assert.match(dump, /^ayat-db-\d{4}-\d{2}-\d{2}T\d{4}Z\.dump\.age$/);
  assert.match(readFileSync(join(r.dir, 'backup', dump), 'utf8'), /^age-encrypted:PGDMP/);
  assert.ok(files.some((f) => f.endsWith('.sha256')));
  assert.ok(!r.log.includes('s3cret') && !r.log.includes('db.example') && !r.log.includes('rows'), r.log);
});

test('a failing pg_dump fails the run without printing the URL or the host', () => {
  const fakes = {
    pg_dump: `echo 'pg_dump: error: connection to server at "db.example.supabase.co" failed: ${URL_}' >&2; exit 1`,
    age: 'cat > /dev/null',
  };
  const r = run('Dump and encrypt', { DB_URL: URL_, AGE_RECIPIENT: 'age1abc', PG_DUMP: 'pg_dump' }, fakes);
  assert.equal(r.ok, false);
  assert.match(r.log, /::error::/);
  assert.ok(!r.log.includes('s3cret') && !r.log.includes('db.example'), r.log);
});

test('an empty dump is a failure, not a green night', () => {
  const fakes = { pg_dump: 'exit 0', age: 'shift 2; cat' };
  const r = run('Dump and encrypt', { DB_URL: URL_, AGE_RECIPIENT: 'age1abc', PG_DUMP: 'pg_dump' }, fakes);
  assert.equal(r.ok, false);
});

test('kept as an artifact for 90 days (the longest a public repository allows)', () => {
  const upload = job.steps.find((s) => String(s.uses).startsWith('actions/upload-artifact@'));
  assert.equal(upload.with['retention-days'], 90);
  assert.equal(upload.with['if-no-files-found'], 'error');
  assert.match(upload.with.path, /backup\//);
});
