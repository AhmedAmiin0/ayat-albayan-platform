// deploy-staging «Build the web app»: both web apps are built with VITE_BUILD_ID = the short sha of
// the checked-out commit, so the API's ClientUsage tells web releases apart (`web/<sha>`, not
// `web/dev`; docs/26 §2f). Runs the step's own script with a fake pnpm that records the env.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const workflow = readFileSync(join(root, '.github/workflows/deploy-staging.yml'), 'utf8');
const step = parse(workflow).jobs.web.steps.find((s) => s.name === 'Build the web app');

function run(env = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'web-build-id-'));
  const log = join(dir, 'calls');
  writeFileSync(join(dir, 'pnpm'), `#!/bin/sh\necho "pnpm $* build_id=$VITE_BUILD_ID" >> ${log}\n`);
  chmodSync(join(dir, 'pnpm'), 0o755);
  writeFileSync(log, '');
  const vars = { PATH: `${dir}:${process.env.PATH}`, VITE_SUPABASE_ANON_KEY: 'anon', ...env };
  execFileSync('bash', ['-eo', 'pipefail', '-c', step.run], { cwd: root, env: vars, stdio: 'pipe' });
  return readFileSync(log, 'utf8').trim().split('\n');
}

const shortSha = () => execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root }).toString().trim();

test('both web apps are built with the short sha of the checked-out commit', () => {
  const calls = run();
  for (const app of ['staff-web', 'family-web']) {
    const build = calls.find((c) => c.startsWith(`pnpm --filter ${app} build`));
    assert.ok(build, `${app} is built`);
    assert.match(build, new RegExp(`build_id=${shortSha()}$`));
  }
});

test('the build id is the commit, not a value left in the job env', () => {
  const builds = run({ VITE_BUILD_ID: 'dev' }).filter((c) => / build build_id=/.test(c));
  assert.equal(builds.length, 3);
  assert.ok(builds.every((c) => c.endsWith(`build_id=${shortSha()}`)), builds.join('\n'));
});
