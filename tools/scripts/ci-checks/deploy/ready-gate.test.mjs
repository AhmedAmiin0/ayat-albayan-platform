// deploy-staging «Health check»: after the roll, /health (the process answers), then /ready (it
// can serve: the database answers) must pass, /ready within a few retries; a failure rolls back.
// Runs the step's own script with a fake curl and ssh (docs/09 «Readiness»).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const read = (p) => readFileSync(fileURLToPath(new URL(`../../../../${p}`, import.meta.url)), 'utf8');
const deploy = parse(read('.github/workflows/deploy-staging.yml')).jobs.deploy;
const step = deploy.steps.find((s) => s.name === 'Health check');

/** Runs the step; `readyExit` is curl's exit code on /ready (22 = an HTTP error such as 503). */
function run({ readyExit, apiUrl }) {
  const dir = mkdtempSync(join(tmpdir(), 'ready-gate-'));
  const log = join(dir, 'calls');
  const ready = `case "$*" in *"/ready"*) exit ${readyExit};; esac`;
  const curl = [`echo "curl $*" >> ${log}`, ready, 'exit 0'];
  writeFileSync(join(dir, 'curl'), ['#!/bin/sh', ...curl, ''].join('\n'));
  writeFileSync(join(dir, 'ssh'), `#!/bin/sh\necho "ssh $*" >> ${log}\nshift\nsh -c "$*"\n`);
  for (const f of ['curl', 'ssh']) chmodSync(join(dir, f), 0o755);
  writeFileSync(log, '');
  const env = { PATH: `${dir}:${process.env.PATH}`, API_URL: apiUrl };
  let ok = true;
  try {
    execFileSync('bash', ['-eo', 'pipefail', '-c', step.run], { env, stdio: 'pipe' });
  } catch {
    ok = false;
  }
  return { ok, calls: readFileSync(log, 'utf8').trim().split('\n') };
}

test('a ready API passes: /health first, then /ready on the public URL', () => {
  const r = run({ readyExit: 0, apiUrl: 'https://api.example.com' });
  assert.equal(r.ok, true);
  const urls = r.calls.map((c) => /https:\/\/\S+/.exec(c)?.[0]);
  assert.deepEqual(urls, ['https://api.example.com/health', 'https://api.example.com/ready']);
});

test('/ready answering 503 fails the step (so the rollback step runs)', () => {
  assert.equal(run({ readyExit: 22, apiUrl: 'https://api.example.com' }).ok, false);
  const rollBack = deploy.steps.find((s) => s.name === 'Roll back to the previous version');
  assert.match(rollBack.if, /steps\.health\.outcome == 'failure'/);
});

test('/ready gets only a few retries, each attempt time-boxed, and 503 is retried', () => {
  const ready = run({ readyExit: 0, apiUrl: 'https://api.example.com' }).calls.at(-1);
  const retries = Number(/--retry (\d+)/.exec(ready)?.[1]);
  assert.ok(retries >= 3 && retries <= 12, ready);
  assert.match(ready, /--retry-all-errors/);
  assert.match(ready, /--max-time \d+/);
  assert.match(ready, /-f/);
});

test('without API_URL both checks run on the server', () => {
  const r = run({ readyExit: 0, apiUrl: '' });
  assert.equal(r.ok, true);
  assert.ok(r.calls.some((c) => /^ssh .*127\.0\.0\.1:3110\/ready/.test(c)), r.calls.join('\n'));
});
