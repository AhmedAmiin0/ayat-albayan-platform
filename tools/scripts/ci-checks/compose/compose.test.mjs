// Guards for deploy/staging (docs/09 «Two API copies + one worker»): the VPS also runs the owner's
// live CRM, so the compose project must stay self-contained, and two API copies must never both run
// the jobs.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { APPS, COPIES, compose, mb, roll, services } from './compose.fixture.mjs';

test('the project and its services', () => {
  assert.equal(compose.name, 'ayat-albayan-staging');
  assert.deepEqual(Object.keys(services).sort(), [
    'ayat-api-a',
    'ayat-api-b',
    'ayat-api-c',
    'ayat-api-d',
    'ayat-lb',
    'ayat-minio',
    'ayat-minio-init',
    'ayat-pdf',
    'ayat-redis',
    'ayat-worker',
  ]);
});

test('only the load balancer and the MinIO console are published, both on localhost only', () => {
  const published = ['ayat-lb', 'ayat-minio'];
  const unpublished = Object.keys(services).filter((n) => !published.includes(n));
  for (const name of unpublished) assert.equal(services[name].ports, undefined, name);
  assert.deepEqual(services['ayat-lb'].ports, ['127.0.0.1:3110:8080']);
  // The console (docs/45 §7): an SSH tunnel only, never the host Caddy.
  assert.deepEqual(services['ayat-minio'].ports, ['127.0.0.1:9001:9001']);
});

test('one image built once, reused by every app service, never pulled', () => {
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

test('roles: four API copies (no jobs, 2 trusted hops, the worker for kicks) and one worker', () => {
  assert.equal(services['ayat-worker'].environment.APP_ROLE, 'worker');
  for (const name of COPIES) {
    const env = services[name].environment;
    assert.equal(env.APP_ROLE, 'api', name);
    assert.equal(env.TRUST_PROXY_HOPS, '2', name);
    assert.equal(env.WORKER_URL, 'http://ayat-worker:3000', name);
    // Each copy reloads the others' config after an admin save (kickConfigReload), never itself
    // or the worker.
    const peers = COPIES.filter((n) => n !== name).map((n) => `http://${n}:3000`);
    assert.equal(env.PEER_URLS, peers.join(','), name);
  }
  assert.equal(services['ayat-worker'].environment.PEER_URLS, undefined);
  assert.equal(
    APPS.filter((n) => services[n].environment.APP_ROLE !== 'api').length,
    1,
    'exactly one job runner',
  );
});

test('memory limits fit the 16 GB VPS beside the CRM', () => {
  const limits = Object.fromEntries(
    Object.entries(services).map(([n, s]) => [n, mb(s.deploy?.resources?.limits?.memory)]),
  );
  assert.deepEqual(limits, {
    'ayat-worker': 1024,
    'ayat-api-a': 512,
    'ayat-api-b': 512,
    'ayat-api-c': 512,
    'ayat-api-d': 512,
    'ayat-pdf': 128,
    'ayat-lb': 64,
    'ayat-redis': 96,
    'ayat-minio': 512,
    'ayat-minio-init': 192,
  });
  // ≈ 3.3 GB of the 16 GB beside the CRM (the worker's 1 GB: Node heap + Chromium; the PDF
  // sandbox's own 128 MB on top: the copies keep 512 MB, they hold each preview's PDF and JPEGs,
  // docs/09). + MinIO and its one-shot init (docs/45; the init needs 192 MB:
  // Chainguard's mc is OOM-killed at 64 MB):
  // ≈ 4.0 GB, a quarter of the VPS.
  assert.ok(Object.values(limits).reduce((a, b) => a + b, 0) <= 4064);
});

test('every other container log rotates (json-file, size-capped): never the disk the CRM shares', () => {
  for (const [name, s] of Object.entries(services).filter(([n]) => !APPS.includes(n))) {
    assert.equal(s.logging?.driver, 'json-file', name);
    assert.match(s.logging.options['max-size'], /^\d+m$/, name);
    assert.match(s.logging.options['max-file'], /^\d$/, name);
  }
});

test('the app logs survive a deploy: journald, tagged by container, readable by docker logs', () => {
  for (const name of APPS) {
    const { logging } = services[name];
    assert.equal(logging?.driver, 'journald', name);
    // journalctl CONTAINER_TAG=ayat-api-a (or -t ayat-api-a) finds a removed container's lines too.
    assert.equal(logging.options.tag, '{{.Name}}', name);
    // Never blocks the app on a slow journal (a lost line beats a stalled request).
    assert.equal(logging.options.mode, 'non-blocking', name);
    assert.match(logging.options['max-buffer-size'], /^\d+m$/, name);
  }
});

test('the shared cache: every app process on ayat-redis, never published, started before the roll', () => {
  for (const name of APPS) assert.equal(services[name].environment.REDIS_URL, 'redis://ayat-redis:6379', name);
  assert.equal(services['ayat-redis'].ports, undefined);
  assert.ok(roll.search(/^dc up -d --no-deps ayat-redis$/m) < roll.search(/^\s+roll ayat-/m), 'Redis before the first roll');
});
