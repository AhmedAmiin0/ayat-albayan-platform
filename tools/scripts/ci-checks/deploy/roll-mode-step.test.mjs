// deploy-staging «Roll mode»: the running image is kept only when «plan» found no API input
// changed since the last code deploy AND the server's .api.sha is that very commit; then the
// .env merge picks --env-only or --no-build. Everything else builds. Runs the step's own script
// with a fake ssh (the server's .api.sha, or a failure).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const read = (p) => readFileSync(fileURLToPath(new URL(`../../../../${p}`, import.meta.url)), 'utf8');
const deploy = parse(read('.github/workflows/deploy-staging.yml')).jobs;
const step = deploy.deploy.steps.find((s) => s.name === 'Roll mode');
const A = 'a'.repeat(40);
const B = 'b'.repeat(40);

/** The step's `args` output for a server .api.sha (null: ssh fails) and the step's env. */
function argsFor(image, env) {
  const dir = mkdtempSync(join(tmpdir(), 'roll-mode-'));
  const ssh = image === null ? 'exit 255' : `printf '%s\\n' '${image}'`;
  writeFileSync(join(dir, 'ssh'), `#!/bin/sh\n${ssh}\n`);
  chmodSync(join(dir, 'ssh'), 0o755);
  const out = join(dir, 'out');
  writeFileSync(out, '');
  const vars = { DEST: '/opt/x', GITHUB_OUTPUT: out, PATH: `${dir}:${process.env.PATH}`, ...env };
  execFileSync('bash', ['-eo', 'pipefail', '-c', step.run], { env: vars, stdio: 'pipe' });
  return /^args=(.*)$/m.exec(readFileSync(out, 'utf8'))?.[1];
}

test('the image is kept only when plan and the server name the same commit', () => {
  assert.equal(argsFor(A, { API_BASE: A, ENV_CHANGED: 'false' }), '--no-build');
  assert.equal(argsFor(A, { API_BASE: A, ENV_CHANGED: 'true' }), '--env-only');
  assert.equal(argsFor(B, { API_BASE: A, ENV_CHANGED: 'false' }), '', 'another image');
  assert.equal(argsFor('', { API_BASE: A, ENV_CHANGED: 'false' }), '', 'no .api.sha');
  assert.equal(argsFor(null, { API_BASE: A, ENV_CHANGED: 'false' }), '', 'ssh failed');
  assert.equal(argsFor(A, { API_BASE: '', ENV_CHANGED: 'false' }), '', 'the API changed');
  assert.equal(argsFor('', { API_BASE: '', ENV_CHANGED: 'false' }), '', 'both unknown');
  assert.equal(argsFor(A, { API_BASE: A }), '', 'the .env merge said nothing');
});

test('wiring: plan → api_base, the .env merge → changed, the roll gets the args', () => {
  assert.equal(deploy.plan.outputs.api_base, '${{ steps.api.outputs.api_base }}');
  const api = deploy.plan.steps.find((s) => s.id === 'api');
  assert.equal(api['continue-on-error'], true, 'a failed decision only means a build');
  assert.match(api.run, /^node tools\/scripts\/ci-checks\/deploy\/api-changed\.ts "\$BASE"/);
  assert.equal(api.env.BASE, '${{ steps.base.outputs.code_base }}');
  assert.equal(step.env.API_BASE, '${{ needs.plan.outputs.api_base }}');
  assert.equal(step.env.ENV_CHANGED, '${{ steps.env.outputs.changed }}');
  const merge = deploy.deploy.steps.find((s) => s.id === 'env');
  assert.match(merge.run, /changed=false/);
  assert.match(merge.run, /changed=true/);
  const roll = deploy.deploy.steps.find((s) => s.id === 'roll');
  assert.equal(roll.env.ROLL_ARGS, '${{ steps.mode.outputs.args }}');
  const ship = deploy.deploy.steps.find((s) => s.id === 'ship');
  assert.match(ship.run, /git rev-parse HEAD \| ssh target "cat > \$DEST\/src\.new\/\.release-sha"/);
});
