// roll.sh and the deploy that ships it (docs/09 «Two API copies + one worker»): never the new layout on code from
// before APP_ROLE (every container would run every job), the first switch only hands over the port, and a
// Caddyfile Caddy refuses never takes 3110 down. Runs the real script against a fake docker (roll-fake.mjs).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { at, root, run } from './roll-fake.mjs';

const workflow = readFileSync(root('.github/workflows/deploy-production.yml'), 'utf8');
const P = 'compose -p ayat-albayan-staging';

test('src from before APP_ROLE: refused before any docker call, build and --env-only alike', () => {
  for (const args of [[], ['--env-only']]) {
    const r = run('roll.sh', { args, roles: false });
    assert.equal(r.code, 1);
    assert.match(r.out, /src predates APP_ROLE: restore docker-compose\.yml\.old \(single container\)/);
    assert.deepEqual(r.log, [], 'no docker command ran');
  }
});

test('a normal roll: one build, worker → pdf sandbox → api-a → api-b (each healthy), then the changed LB validated and reloaded', () => {
  const r = run('roll.sh', { up: ['ayat-worker', 'ayat-pdf', 'ayat-api-a', 'ayat-api-b', 'ayat-lb'] });
  assert.equal(r.code, 0, r.out);
  assert.match(r.log[0], new RegExp(`^docker ${P} build ayat-worker$`));
  const order = ['up -d --no-deps ayat-worker', 'up -d --no-deps ayat-pdf', 'up -d --no-deps ayat-api-a', 'up -d --no-deps ayat-api-b',
    'run --rm --network none', 'exec -T ayat-lb caddy reload', 'up -d --no-deps ayat-lb', 'curl'];
  const idx = order.map((o) => at(r.log, o));
  assert.ok(idx.every((i, n) => i >= 0 && (n === 0 || i > idx[n - 1])), `order: ${r.log.join('\n')}`);
  assert.ok(at(r.log, 'stop') < 0, 'nothing is stopped');
  assert.match(r.log.at(-2), /image prune -f --filter label=com\.docker\.compose\.project=ayat-albayan-staging/);
  assert.ok(r.text('.lb.sha256'));
});

test('a PDF sandbox that never gets healthy only warns: api-a, api-b and the LB still roll, the deploy succeeds', () => {
  const r = run('roll.sh', { up: ['ayat-worker', 'ayat-api-a', 'ayat-api-b', 'ayat-lb'], fail: ['up -d --no-deps ayat-pdf'] });
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /::warning::ayat-pdf not healthy: chat PDF previews answer pdf_unavailable/);
  const idx = ['up -d --no-deps ayat-pdf', 'up -d --no-deps ayat-api-a', 'up -d --no-deps ayat-api-b', 'up -d --no-deps ayat-lb', 'curl']
    .map((o) => at(r.log, o));
  assert.ok(idx.every((i, n) => i >= 0 && (n === 0 || i > idx[n - 1])), `order: ${r.log.join('\n')}`);
});

test('first switch: LB pulled and Caddyfile validated, copies up, then `stop <legacy>` BEFORE the worker starts', () => {
  const r = run('roll.sh', { up: ['ayat-api'] });
  assert.equal(r.code, 0, r.out);
  const pull = at(r.log, `${P} pull ayat-lb`);
  const valid = at(r.log, 'run --rm --network none');
  const sandbox = at(r.log, 'up -d --no-deps ayat-pdf');
  const a = at(r.log, 'up -d --no-deps ayat-api-a');
  const b = at(r.log, 'up -d --no-deps ayat-api-b');
  const stop = at(r.log, 'stop -t 30 id-ayat-api');
  const rm = at(r.log, 'rm id-ayat-api');
  const lbUp = at(r.log, 'up -d --no-deps ayat-lb');
  const worker = at(r.log, 'up -d --no-deps ayat-worker');
  assert.ok(pull >= 0 && pull < valid && valid < sandbox && sandbox < a && a < b && b < stop && stop < rm && rm < lbUp && lbUp < worker, r.log.join('\n'));
});

test('an invalid Caddyfile fails the roll: no reload, no forced LB recreate, the old sum kept', () => {
  const r = run('roll.sh', { up: ['ayat-worker', 'ayat-api-a', 'ayat-api-b', 'ayat-lb'], files: { '.lb.sha256': 'old\n' }, fail: ['caddy validate'] });
  assert.notEqual(r.code, 0);
  assert.match(r.out, /lb\/Caddyfile is invalid/);
  assert.ok(at(r.log, 'caddy reload') < 0 && at(r.log, 'force-recreate') < 0 && at(r.log, 'up -d --no-deps ayat-lb') < 0);
  assert.ok(at(r.log, 'exec -T ayat-lb caddy validate') < 0, 'never a second Caddy inside the running LB');
  assert.equal(r.text('.lb.sha256'), 'old\n');
});

test('a reload Caddy refuses fails the roll the same way; first switch: an invalid file never stops the old container', () => {
  const reload = run('roll.sh', { up: ['ayat-worker', 'ayat-api-a', 'ayat-api-b', 'ayat-lb'], files: { '.lb.sha256': 'old\n' }, fail: ['caddy reload'] });
  assert.notEqual(reload.code, 0);
  assert.ok(at(reload.log, 'force-recreate') < 0 && at(reload.log, 'up -d --no-deps ayat-lb') < 0);
  assert.ok(!reload.has('.lb.sha256'), 'the stored sum is dropped before the reload: a rollback reloads its file');
  const first = run('roll.sh', { up: ['ayat-api'], fail: ['caddy validate'] });
  assert.notEqual(first.code, 0);
  // Only the shared cache (ayat-redis, started before every roll) may come up: no sandbox, copy, worker or LB, no stop.
  const started = ['ayat-pdf', 'ayat-api-a', 'ayat-api-b', 'ayat-worker', 'ayat-lb'].map((svc) => at(first.log, `up -d --no-deps ${svc}`));
  assert.ok(at(first.log, 'stop') < 0 && started.every((i) => i < 0), first.log.join('\n'));
});

test('the workflow swaps and rolls under the deploy lock, and a failed roll runs rollback.sh in the same command', () => {
  for (const f of ['docker-compose.yml', 'roll.sh', 'rollback.sh', 'lb/Caddyfile']) {
    const name = f.replace('.', '\\.');
    assert.match(workflow, new RegExp(`deploy/staging/${name}"? "[^"]*/${name}\\.new"`), `${f} goes up as ${f}.new`);
  }
  const block = workflow.slice(workflow.indexOf('setsid -w flock -n -E 75 .deploy.lock sh -c'), workflow.indexOf('case "$rc" in'));
  assert.match(block, /mv src\.new src &&/);
  assert.match(block, /mv docker-compose\.yml\.new docker-compose\.yml && mv roll\.sh\.new roll\.sh && mv rollback\.sh\.new rollback\.sh/);
  assert.match(block, /cat lb\/Caddyfile\.new > lb\/Caddyfile/, 'same inode: ayat-lb mounts the directory');
  assert.match(block, /rm lb\/Caddyfile\.new \|\| exit 4\n\s*\{ sh roll\.sh \|\| \{ sh rollback\.sh \|\| exit 3; exit 1; \}; \}' > \.deploy\.log 2>&1 < \/dev\/null/);
  assert.match(block, /setsid -w flock/, 'an ssh drop never stops the roll or its rollback halfway');
  for (const rc of ['75', '1', '3', '4', '255']) assert.match(workflow, new RegExp(`\\n\\s*${rc}\\) echo "::error::`), `exit ${rc} has its own message`);
  assert.match(workflow, /setsid -w flock -n -E 75 \.deploy\.lock sh rollback\.sh > \.deploy\.log 2>&1 < \/dev\/null/, 'the health-check rollback too, detached');
  assert.match(workflow, /ServerAliveInterval 30\\n {2}ServerAliveCountMax 6/, 'keepalives: a silent roll never loses its ssh');
  assert.match(workflow, /flock -n -E 75 \.deploy\.lock sh -c 'if \[ -f roll\.sh \]/, 'env_only too');
  assert.doesNotMatch(workflow, /steps\.ship\.outcome == 'failure'/);
});

test('the laptop deploy refuses and points to the workflow (no lock, no rollback there)', () => {
  const local = readFileSync(root('tools/scripts/env/deploy-staging.sh'), 'utf8');
  assert.match(local, /\nexit 1\n$/);
  assert.doesNotMatch(local.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n'), /\bssh |\bscp |supabase |docker /);
});
