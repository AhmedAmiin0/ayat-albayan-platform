// Guards for deploy/staging (docs/09): the load balancer, roll.sh and the deploy touch only this project, and the
// compose file is valid for the Docker CLI.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { caddy, composePath, deploy, roll, rollback, services } from './compose.fixture.mjs';

test('the load balancer: a pinned image, its own config only, both copies with active health checks', () => {
  assert.match(services['ayat-lb'].image, /^caddy:\d+\.\d+\.\d+-alpine$/);
  assert.deepEqual(services['ayat-lb'].volumes, ['./lb:/etc/caddy:ro']);
  assert.match(caddy, /reverse_proxy ayat-api-a:3000 ayat-api-b:3000/);
  for (const d of [
    'lb_policy round_robin',
    'health_uri /health',
    'lb_try_duration',
    'trusted_proxies static private_ranges',
  ]) {
    assert.ok(caddy.includes(d), d);
  }
  assert.match(caddy, /admin localhost:2019/, 'the admin API stays inside the container');
  assert.match(caddy, /@internal path \/internal \/internal\/\*\n\s*respond @internal 404/, '/internal never reaches a copy from outside');
  assert.ok(caddy.indexOf('respond @internal 404') < caddy.indexOf('reverse_proxy'));
  assert.equal(/^LB_IMAGE=(.+)$/m.exec(roll)?.[1], services['ayat-lb'].image, 'roll.sh validates with the same image');
});

test('roll.sh and the deploy touch only this project (no global prune, no CRM, no host Caddy)', () => {
  // Commands only (comments may name what is never touched); the container's own /etc/caddy is ayat-lb's.
  const code = (text) =>
    text
      .split('\n')
      .filter((l) => !/^\s*#/.test(l))
      .join('\n')
      .replaceAll('--config /etc/caddy/Caddyfile', '')
      .replaceAll('/lb:/etc/caddy:ro', '');
  for (const text of [roll, rollback, deploy].map(code)) {
    assert.doesNotMatch(
      text,
      /system prune|builder prune|volume prune|network prune|container prune/,
    );
    assert.doesNotMatch(
      text,
      /\/opt\/wacrm|\/etc\/caddy|systemctl|docker compose down/,
    );
  }
  for (const text of [roll, rollback]) {
    assert.match(
      text,
      /docker image prune -f --filter "label=com\.docker\.compose\.project=\$PROJECT"/,
    );
    assert.match(text, /PROJECT=ayat-albayan-staging/);
  }
  assert.doesNotMatch(roll, /force-recreate ayat-lb/, 'a refused Caddyfile is never forced in');
  // Comment lines may sit between the rolls; the order may not change.
  assert.match(
    roll,
    /\n {2}roll ayat-worker\n(\s*#.*\n)* {2}roll ayat-pdf \|\| echo [^\n]*\n {2}roll ayat-api-a\n {2}roll ayat-api-b\n {2}lb\n/,
    'worker → pdf sandbox → api-a → api-b → lb',
  );
  assert.match(
    deploy,
    /steps\.roll\.outcome == 'success' && steps\.health\.outcome == 'failure'/,
    'a failed health check rolls back (a failed roll already did, in its own command)',
  );
});

test('docker compose config accepts the file (when the Docker CLI is here)', (t) => {
  try {
    execFileSync('docker', ['compose', 'version'], { stdio: 'ignore' });
  } catch {
    t.skip('no docker compose CLI on this machine');
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), 'compose-'));
  try {
    copyFileSync(composePath, join(dir, 'docker-compose.yml'));
    writeFileSync(join(dir, '.env'), '');
    execFileSync(
      'docker',
      ['compose', '-f', join(dir, 'docker-compose.yml'), 'config', '--quiet'],
      { stdio: 'pipe' },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
