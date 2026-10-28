// Guards for deploy/staging (docs/09 «Two API copies + one worker»): the VPS also runs the owner's live CRM,
// so the compose project must stay self-contained, and two API copies must never both run the jobs.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = (p) => fileURLToPath(new URL(`../../../${p}`, import.meta.url));
const composePath = root('deploy/staging/docker-compose.yml');
const compose = parse(readFileSync(composePath, 'utf8'), { merge: true });
const caddy = readFileSync(root('deploy/staging/lb/Caddyfile'), 'utf8');
const roll = readFileSync(root('deploy/staging/roll.sh'), 'utf8');
const rollback = readFileSync(root('deploy/staging/rollback.sh'), 'utf8');
const deploy = readFileSync(root('.github/workflows/deploy-staging.yml'), 'utf8');
const services = compose.services;
const APPS = ['ayat-worker', 'ayat-api-a', 'ayat-api-b'];
const mb = (v) => Number(/^(\d+)M$/.exec(v)?.[1] ?? NaN);

test('the project and its services', () => {
  assert.equal(compose.name, 'ayat-albayan-staging');
  assert.deepEqual(Object.keys(services).sort(), [
    'ayat-api-a',
    'ayat-api-b',
    'ayat-lb',
    'ayat-redis',
    'ayat-worker',
  ]);
});

test('only the load balancer is published, on localhost:3110 (the host Caddy target, unchanged)', () => {
  for (const name of APPS) assert.equal(services[name].ports, undefined, name);
  assert.deepEqual(services['ayat-lb'].ports, ['127.0.0.1:3110:8080']);
});

test('one image built once, reused by the three app services, never pulled', () => {
  const builds = APPS.filter((n) => services[n].build);
  assert.deepEqual(builds, ['ayat-worker']);
  for (const name of APPS) {
    assert.equal(services[name].image, 'ayat-api:staging', name);
    assert.equal(services[name].pull_policy, 'never', name);
    assert.ok(
      services[name].healthcheck?.test?.join(' ').includes('/health'),
      `${name} healthcheck`,
    );
  }
});

test('roles: two API copies (no jobs, 2 trusted hops, the worker for kicks) and one worker', () => {
  assert.equal(services['ayat-worker'].environment.APP_ROLE, 'worker');
  for (const name of ['ayat-api-a', 'ayat-api-b']) {
    const env = services[name].environment;
    assert.equal(env.APP_ROLE, 'api', name);
    assert.equal(env.TRUST_PROXY_HOPS, '2', name);
    assert.equal(env.WORKER_URL, 'http://ayat-worker:3000', name);
  }
  // Each copy reloads the other's config after an admin save (kickConfigReload), never itself or the worker.
  assert.equal(services['ayat-api-a'].environment.PEER_URLS, 'http://ayat-api-b:3000');
  assert.equal(services['ayat-api-b'].environment.PEER_URLS, 'http://ayat-api-a:3000');
  assert.equal(services['ayat-worker'].environment.PEER_URLS, undefined);
  assert.equal(
    APPS.filter((n) => services[n].environment.APP_ROLE !== 'api').length,
    1,
    'exactly one job runner',
  );
});

test('memory limits fit the 8 GB VPS beside the CRM', () => {
  const limits = Object.fromEntries(
    Object.entries(services).map(([n, s]) => [n, mb(s.deploy?.resources?.limits?.memory)]),
  );
  assert.deepEqual(limits, {
    'ayat-worker': 1024,
    'ayat-api-a': 512,
    'ayat-api-b': 512,
    'ayat-lb': 64,
    'ayat-redis': 96,
  });
  // ≈ 2.2 GB of the 8 GB beside the CRM (the worker's 1 GB: Node heap + Chromium, docs/09).
  assert.ok(Object.values(limits).reduce((a, b) => a + b, 0) <= 2272);
});

test('the shared cache: every app process on ayat-redis, never published, started before the roll', () => {
  for (const name of APPS) assert.equal(services[name].environment.REDIS_URL, 'redis://ayat-redis:6379', name);
  assert.equal(services['ayat-redis'].ports, undefined);
  assert.ok(roll.search(/^dc up -d --no-deps ayat-redis$/m) < roll.search(/^\s+roll ayat-/m), 'Redis before the first roll');
});

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
  const order = ['roll ayat-worker\n  roll ayat-api-a\n  roll ayat-api-b\n  lb'];
  assert.ok(
    order.every((o) => roll.includes(o)),
    'worker → api-a → api-b → lb',
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
