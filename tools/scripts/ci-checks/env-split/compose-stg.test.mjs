// deploy/stg (STAGING, docs/09 «Staging») beside deploy/staging (PRODUCTION, legacy name) on one
// VPS with the live CRM: no shared project, image tag or port; one API process; the PDF sandbox
// hardened exactly like production's; about 1 GB in all; Stripe on staging only.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = (p) => fileURLToPath(new URL(`../../../../${p}`, import.meta.url));
const compose = (dir) => parse(readFileSync(root(`deploy/${dir}/docker-compose.yml`), 'utf8'), { merge: true });
const stg = compose('stg');
const prod = compose('staging');
const api = stg.services['ayat-api'];
const mb = (v) => Number(/^(\d+)M$/.exec(v)?.[1] ?? NaN);

test('its own project, image tag and localhost port: never production\'s', () => {
  assert.equal(stg.name, 'ayat-albayan-stg');
  assert.deepEqual(Object.keys(stg.services).sort(), ['ayat-api', 'ayat-pdf']);
  for (const s of Object.values(stg.services)) assert.equal(s.image, 'ayat-api:stg');
  assert.deepEqual(api.ports, ['127.0.0.1:3120:3000']);
  assert.equal(stg.services['ayat-pdf'].ports, undefined);
  assert.deepEqual(api.build, { context: './src', dockerfile: 'apps/api/Dockerfile' });
  assert.equal(api.pull_policy, 'never');
  assert.equal(prod.name, 'ayat-albayan-staging');
  assert.ok(Object.values(prod.services).every((s) => s.image !== 'ayat-api:stg'));
});

test('one API process runs HTTP and every job; staging hosts pinned over .env', () => {
  const env = api.environment;
  assert.equal(env.APP_ROLE, undefined, 'unset = all: the only job runner');
  for (const k of ['WORKER_URL', 'PEER_URLS', 'REDIS_URL', 'TRUST_PROXY_HOPS', 'EXPO_API_BASE']) assert.equal(env[k], undefined, k);
  assert.deepEqual(env, {
    SUPABASE_URL: 'https://gqkqbxxgqttfbbqoqedf.supabase.co',
    WEB_ORIGIN: 'https://staging-app.ayatalbayan.com',
    GOOGLE_REDIRECT_URI: 'https://staging-api.ayatalbayan.com/integrations/google/callback',
    FEATURE_STRIPE: 'test',
    API_PUBLIC_URL: 'https://staging-api.ayatalbayan.com',
    WA_TEMPLATE_SYNC: 'false',
    NODE_OPTIONS: '--max-old-space-size=384',
  });
  assert.equal(api.env_file, '.env');
  assert.ok(api.healthcheck.test.join(' ').includes('/health'));
});

test('Stripe test links on staging only: production sets neither FEATURE_STRIPE nor API_PUBLIC_URL', () => {
  const raw = readFileSync(root('deploy/staging/docker-compose.yml'), 'utf8');
  assert.doesNotMatch(raw, /^\s*(FEATURE_STRIPE|API_PUBLIC_URL):/m);
  for (const s of Object.values(prod.services)) {
    assert.equal(s.environment?.FEATURE_STRIPE, undefined);
    assert.equal(s.environment?.API_PUBLIC_URL, undefined);
  }
});

test('the PDF sandbox is production\'s, image aside; only the API mounts its socket, read-only', () => {
  const { image, ...sandbox } = stg.services['ayat-pdf'];
  const { image: prodImage, ...prodSandbox } = prod.services['ayat-pdf'];
  assert.deepEqual([image, prodImage], ['ayat-api:stg', 'ayat-api:staging']);
  assert.deepEqual(sandbox, prodSandbox);
  assert.deepEqual(stg.volumes, prod.volumes);
  assert.deepEqual(api.volumes, ['pdf-sock:/run/pdf:ro']);
});

test('about 1 GB in all, and every log rotates', () => {
  const limits = Object.values(stg.services).map((s) => mb(s.deploy.resources.limits.memory));
  assert.ok(limits.reduce((a, b) => a + b, 0) <= 1024, String(limits));
  for (const [name, s] of Object.entries(stg.services)) {
    assert.equal(s.logging?.driver, 'json-file', name);
    assert.match(s.logging.options['max-size'], /^\d+m$/, name);
  }
});

test('docker compose config accepts deploy/stg (when the Docker CLI is here)', (t) => {
  try {
    execFileSync('docker', ['compose', 'version'], { stdio: 'ignore' });
  } catch {
    t.skip('no docker compose CLI on this machine');
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), 'compose-stg-'));
  try {
    copyFileSync(root('deploy/stg/docker-compose.yml'), join(dir, 'docker-compose.yml'));
    writeFileSync(join(dir, '.env'), '');
    const file = join(dir, 'docker-compose.yml');
    execFileSync('docker', ['compose', '-f', file, 'config', '--quiet'], { stdio: 'pipe' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
