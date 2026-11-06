// Guards for ayat-minio, the object storage of every new file (docs/45-minio-storage.md): off until the owner sets
// the profile, never on the host network, never the app's .env secrets, never MinIO's default credentials.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { caddy, compose, root, services } from './compose.fixture.mjs';

const minio = services['ayat-minio'];
const init = services['ayat-minio-init'];
const initSh = readFileSync(root('deploy/staging/minio/init.sh'), 'utf8');
const backupSh = readFileSync(root('deploy/staging/minio/backup.sh'), 'utf8');
const BUCKETS = 'reports report-attachments receipts invoices wa-media recordings avatars';
const RELEASE = /:RELEASE\.\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z$/;

test('both behind the minio profile: merging never starts them on a server whose .env is not ready', () => {
  assert.deepEqual(minio.profiles, ['minio']);
  assert.deepEqual(init.profiles, ['minio']);
});

test('pinned release images, never :latest', () => {
  assert.match(minio.image, /^minio\/minio:RELEASE\./);
  assert.match(minio.image, RELEASE);
  assert.match(init.image, /^minio\/mc:RELEASE\./);
  assert.match(init.image, RELEASE);
  assert.equal(/^MC_IMAGE=(.+)$/m.exec(backupSh)?.[1], init.image, 'the backup uses the same mc');
});

test('internal only: no published port, no host network, no console', () => {
  for (const s of [minio, init]) {
    assert.equal(s.ports, undefined);
    assert.equal(s.network_mode, undefined);
  }
  assert.equal(minio.environment.MINIO_BROWSER, 'off');
});

test('no app secrets: no env_file, the root keys by interpolation from .env only', () => {
  for (const s of [minio, init]) assert.equal(s.env_file, undefined);
  assert.equal(minio.environment.MINIO_ROOT_USER, '${MINIO_ROOT_USER:-}');
  assert.equal(minio.environment.MINIO_ROOT_PASSWORD, '${MINIO_ROOT_PASSWORD:-}');
  for (const [key, value] of Object.entries(init.environment)) assert.equal(value, `\${${key}:-}`, key);
  assert.doesNotMatch(JSON.stringify([minio, init]), /minioadmin/);
});

test('refuses to start without real root credentials (never the default)', () => {
  assert.deepEqual(minio.entrypoint, ['/bin/sh', '-c']);
  const script = minio.command.join('\n');
  assert.match(script, /"\$\$\{#MINIO_ROOT_PASSWORD\}" -ge 16/);
  assert.match(script, /"\$\$\{#MINIO_ROOT_USER\}" -ge 3/);
  assert.match(script, /exit 1/);
  assert.match(script, /exec minio server \/data\s*$/);
});

test('its data on a named volume, a health check, rotated logs, 512 MB', () => {
  assert.deepEqual(minio.volumes, ['minio-data:/data']);
  assert.ok(Object.hasOwn(compose.volumes, 'minio-data'), 'a named volume, not a host path');
  assert.deepEqual(minio.healthcheck.test, ['CMD', 'mc', 'ready', 'local']);
  assert.equal(minio.restart, 'unless-stopped');
  assert.equal(minio.deploy.resources.limits.memory, '512M');
  assert.equal(minio.logging.driver, 'json-file');
});

test('init: one shot, after MinIO, its script read-only from the shipped checkout', () => {
  assert.equal(init.restart, 'no');
  assert.equal(init.deploy.resources.limits.memory, '64M');
  // service_started, not service_healthy: a MinIO that will not start must never fail roll.sh's last `up -d`.
  assert.deepEqual(init.depends_on, { 'ayat-minio': { condition: 'service_started' } });
  assert.deepEqual(init.entrypoint, ['/bin/sh', '/ayat-minio/init.sh']);
  assert.deepEqual(init.volumes, ['./src/deploy/staging/minio:/ayat-minio:ro']);
});

test('init.sh: private buckets, an app user limited to object calls, refuses weak keys', () => {
  assert.ok(initSh.includes(`BUCKETS="${BUCKETS}"`));
  assert.ok(backupSh.includes(`BUCKETS="${BUCKETS}"`), 'the backup copies the same buckets');
  assert.match(initSh, /PREFIX="\$\{MINIO_BUCKET_PREFIX:-\}"/);
  assert.match(initSh, /mc mb --ignore-existing "\$ALIAS\/\$PREFIX\$b"/);
  assert.match(initSh, /mc anonymous set none "\$ALIAS\/\$PREFIX\$b"/);
  assert.match(initSh, /\[ "\$\{#MINIO_ROOT_PASSWORD\}" -ge 16 \] \|\| fail/);
  assert.match(initSh, /\[ "\$\{#MINIO_APP_SECRET_KEY\}" -ge 16 \]/);
  const actions = [...initSh.matchAll(/"(s3:\w+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(actions, [
    's3:DeleteObject',
    's3:GetBucketLocation',
    's3:GetObject',
    's3:ListBucket',
    's3:PutObject',
  ]);
  assert.doesNotMatch(initSh, /s3:\*|"\*"|consoleAdmin|readwrite/);
  assert.match(initSh, /mc admin policy attach "\$ALIAS" "\$POLICY" --user "\$MINIO_APP_ACCESS_KEY"/);
});

test('the backup reads with the app keys, never root, and touches only this project', () => {
  assert.doesNotMatch(backupSh, /MINIO_ROOT_/);
  assert.match(backupSh, /NETWORK=ayat-albayan-staging_default/);
  assert.match(backupSh, /-e MINIO_APP_ACCESS_KEY -e MINIO_APP_SECRET_KEY/);
  assert.doesNotMatch(backupSh, /mc mirror[^\n]*--remove|docker (system|volume) prune|\/opt\/wacrm\//);
});

test('ayat-lb: files.ayatalbayan.com → ayat-minio:9000 after the API site, admin routes closed, safe headers', () => {
  const at = caddy.indexOf('http://files.ayatalbayan.com:8080 {');
  assert.ok(at > caddy.indexOf(':8080 {'), 'the API catch-all site stays first');
  const site = caddy.slice(at);
  assert.match(site, /reverse_proxy ayat-minio:9000 \{/);
  assert.match(site, /header_down X-Content-Type-Options nosniff/);
  assert.match(site, /header_down Referrer-Policy no-referrer/);
  assert.match(site, /header_down Content-Security-Policy "default-src 'none';[^"]*"/);
  assert.match(site, /path \/minio\/\*\n\s*not path \/minio\/health\/\*\n\s*\}\n\s*respond @minio_internal 404/);
  assert.ok(site.indexOf('respond @minio_internal 404') < site.indexOf('reverse_proxy'));
  // The Host header is what MinIO checks the signature against: never rewritten.
  assert.doesNotMatch(site, /header_up\s+Host/);
  assert.doesNotMatch(site, /request_body|max_size/);
});
