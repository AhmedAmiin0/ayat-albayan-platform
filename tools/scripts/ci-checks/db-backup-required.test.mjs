// db-backup.yml (docs/backups.md): BACKUP_REQUIRED=true makes a missing secret a failed run (GitHub
// then emails the owner); unset, the switch stays an «off» notice. The size check warns before
// the Free plan's 500 MB cap and never prints the URL.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const file = fileURLToPath(new URL('../../../.github/workflows/db-backup.yml', import.meta.url));
const job = parse(readFileSync(file, 'utf8')).jobs.dump;
const step = (name) => job.steps.find((s) => s.name === name);
const URL_ = 'postgresql://postgres.ref:s3cret-pass@db.example.supabase.co:5432/postgres';

/** Runs one step's script with fake binaries on PATH: exit status, joined output, step outputs. */
function run(name, env, fakes = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'db-backup-req-'));
  for (const [bin, body] of Object.entries(fakes)) {
    writeFileSync(join(dir, bin), `#!/bin/sh\n${body}\n`);
    chmodSync(join(dir, bin), 0o755);
  }
  const out = join(dir, 'out');
  writeFileSync(out, '');
  const vars = { PATH: `${dir}:${process.env.PATH}`, GITHUB_OUTPUT: out, ...env };
  const r = spawnSync('bash', ['-eo', 'pipefail', '-c', step(name).run], { env: vars, cwd: dir });
  return { ok: r.status === 0, log: `${r.stdout}${r.stderr}`, outputs: readFileSync(out, 'utf8') };
}

const ON = { DB_URL: URL_, AGE_RECIPIENT: 'age1abc' };
const { SIZE_WARN_MB, SIZE_CAP_MB } = job.env;
const SIZE = {
  ...ON,
  PSQL: 'psql',
  SIZE_WARN_MB: `${SIZE_WARN_MB}`,
  SIZE_CAP_MB: `${SIZE_CAP_MB}`,
};
const MB = 1024 * 1024;
const psql = (bytes) => ({ psql: `echo ${bytes}` });

test('the switch reads the repository variable BACKUP_REQUIRED', () => {
  assert.equal(job.env.BACKUP_REQUIRED, '${{ vars.BACKUP_REQUIRED }}');
});

test('required and a secret or key missing → the run fails with an error, no URL in the log', () => {
  for (const env of [{}, { DB_URL: URL_ }, { AGE_RECIPIENT: 'age1abc' }]) {
    const r = run('Check the switch', { ...env, BACKUP_REQUIRED: 'true' });
    assert.equal(r.ok, false, r.log);
    assert.match(r.log, /::error::/);
    assert.doesNotMatch(r.log, /::notice::/);
    assert.ok(!r.log.includes('s3cret'));
  }
});

test('not required (unset, empty or false) → still a green notice', () => {
  for (const flag of [undefined, '', 'false']) {
    const r = run('Check the switch', flag === undefined ? {} : { BACKUP_REQUIRED: flag });
    assert.equal(r.ok, true, r.log);
    assert.match(r.log, /::notice::/);
    assert.match(r.outputs, /^on=false$/m);
  }
});

test('required and fully set → on, no error', () => {
  const r = run('Check the switch', { ...ON, BACKUP_REQUIRED: 'true' });
  assert.equal(r.ok, true, r.log);
  assert.match(r.outputs, /^on=true$/m);
  assert.doesNotMatch(r.log, /::error::/);
});

test('the warning sits at 400 MB under the Free cap of 500 MB', () => {
  assert.equal(job.env.SIZE_WARN_MB, 400);
  assert.equal(job.env.SIZE_CAP_MB, 500);
});

test('the size step runs only when on and comes before the dump', () => {
  const names = job.steps.map((s) => s.name);
  assert.match(String(step('Log the database size').if), /steps\.switch\.outputs\.on == 'true'/);
  assert.ok(names.indexOf('Log the database size') < names.indexOf('Dump and encrypt'));
});

test('below 400 MB → the size is logged in MB, no warning', () => {
  const r = run('Log the database size', SIZE, psql(120 * MB));
  assert.equal(r.ok, true, r.log);
  assert.match(r.log, /120 MB/);
  assert.doesNotMatch(r.log, /::warning::/);
});

test('above 400 MB → a warning that names the 500 MB Free cap', () => {
  const r = run('Log the database size', SIZE, psql(401 * MB));
  assert.equal(r.ok, true, r.log);
  assert.match(r.log, /::warning::.*401 MB.*500 MB/);
});

test('exactly 400 MB is not yet a warning', () => {
  const r = run('Log the database size', SIZE, psql(400 * MB));
  assert.doesNotMatch(r.log, /::warning::/);
});

test('a failing size query warns without the URL or the host and leaves the dump to run', () => {
  const fake = { psql: `echo 'psql: error: connection to "db.example.supabase.co" ${URL_}' >&2; exit 2` };
  const r = run('Log the database size', SIZE, fake);
  assert.equal(r.ok, true, r.log);
  assert.match(r.log, /::warning::/);
  assert.ok(!r.log.includes('s3cret') && !r.log.includes('db.example'), r.log);
});

test('a non-numeric answer is a warning, not a number', () => {
  const r = run('Log the database size', SIZE, psql('oops'));
  assert.equal(r.ok, true, r.log);
  assert.match(r.log, /::warning::/);
  assert.doesNotMatch(r.log, /oops MB/);
});
