// Guards for deploy/staging (docs/09 «Two API copies + one worker»): the VPS also runs the owner's live CRM,
// so the compose project must stay self-contained, and two API copies must never both run the jobs.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { APPS, compose, mb, roll, services } from './compose.fixture.mjs';

test('the project and its services', () => {
  assert.equal(compose.name, 'ayat-albayan-staging');
  assert.deepEqual(Object.keys(services).sort(), [
    'ayat-api-a',
    'ayat-api-b',
    'ayat-lb',
    'ayat-pdf',
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
    'ayat-pdf': 128,
    'ayat-lb': 64,
    'ayat-redis': 96,
  });
  // ≈ 2.3 GB of the 8 GB beside the CRM (the worker's 1 GB: Node heap + Chromium; the PDF sandbox's own 128 MB on
  // top: the copies keep 512 MB, they hold each preview's PDF and JPEGs, docs/09).
  assert.ok(Object.values(limits).reduce((a, b) => a + b, 0) <= 2336);
});

test('every container log rotates (json-file, size-capped): never the disk the CRM shares', () => {
  for (const [name, s] of Object.entries(services)) {
    assert.equal(s.logging?.driver, 'json-file', name);
    assert.match(s.logging.options['max-size'], /^\d+m$/, name);
    assert.match(s.logging.options['max-file'], /^\d$/, name);
  }
});

test('the shared cache: every app process on ayat-redis, never published, started before the roll', () => {
  for (const name of APPS) assert.equal(services[name].environment.REDIS_URL, 'redis://ayat-redis:6379', name);
  assert.equal(services['ayat-redis'].ports, undefined);
  assert.ok(roll.search(/^dc up -d --no-deps ayat-redis$/m) < roll.search(/^\s+roll ayat-/m), 'Redis before the first roll');
});
