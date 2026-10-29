// Guards for ayat-pdf, the chat PDF sandbox (docs/09 «PDF sandbox»): poppler parses strangers' PDFs there, so it
// must hold no secret, reach no network and share only its socket with the two API copies.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = (p) => fileURLToPath(new URL(`../../../${p}`, import.meta.url));
const compose = parse(readFileSync(root('deploy/staging/docker-compose.yml'), 'utf8'), { merge: true });
const roll = readFileSync(root('deploy/staging/roll.sh'), 'utf8');
const rollback = readFileSync(root('deploy/staging/rollback.sh'), 'utf8');
const dockerfile = readFileSync(root('apps/api/Dockerfile'), 'utf8');
const services = compose.services;
const pdf = services['ayat-pdf'];
const SOCK = 'pdf-sock:/run/pdf';

test('the API image, never built or pulled here, with its own command', () => {
  assert.equal(pdf.image, 'ayat-api:staging');
  assert.equal(pdf.pull_policy, 'never');
  assert.equal(pdf.build, undefined);
  assert.deepEqual(pdf.command, ['node', 'dist/modules/messaging/inbox/files/pdf/pdf-sandbox.js']);
  assert.ok(existsSync(root('apps/api/src/modules/messaging/inbox/files/pdf/pdf-sandbox.ts')), 'the entry the command runs');
});

test('nothing worth stealing: no env_file, no secret, no network, no port', () => {
  assert.equal(pdf.env_file, undefined);
  assert.deepEqual(Object.keys(pdf.environment).sort(), ['NODE_ENV', 'NODE_OPTIONS']);
  assert.equal(pdf.network_mode, 'none');
  assert.equal(pdf.networks, undefined);
  assert.equal(pdf.ports, undefined);
});

test('locked down: read-only root, no capability, no setuid, non-root, tmpfs /tmp, few pids', () => {
  assert.equal(pdf.read_only, true);
  assert.deepEqual(pdf.cap_drop, ['ALL']);
  assert.equal(pdf.cap_add, undefined);
  assert.deepEqual(pdf.security_opt, ['no-new-privileges:true']);
  assert.equal(pdf.user, 'node');
  assert.equal(pdf.privileged, undefined);
  assert.deepEqual(pdf.tmpfs, ['/tmp:size=64m']);
  const { cpus, pids } = pdf.deploy.resources.limits;
  assert.ok(cpus && pids > 0 && pids <= 64);
  assert.equal(pdf.restart, 'unless-stopped');
});

test('the socket volume: only ayat-pdf and the two API copies (read-only there), never the worker', () => {
  assert.ok('pdf-sock' in compose.volumes);
  const mounting = Object.entries(services)
    .filter(([, s]) => (s.volumes ?? []).some((v) => String(v).startsWith('pdf-sock:')))
    .map(([n]) => n)
    .sort();
  assert.deepEqual(mounting, ['ayat-api-a', 'ayat-api-b', 'ayat-pdf']);
  assert.deepEqual(pdf.volumes, [SOCK]);
  for (const name of ['ayat-api-a', 'ayat-api-b']) assert.ok(services[name].volumes.includes(`${SOCK}:ro`), name);
  assert.match(dockerfile, /install -d -o node -g node -m 0700 \/run\/pdf/, 'a fresh volume is node-owned');
});

test('healthy once it listens (the roll waits for it), rolled before the copies, stopped by the old-layout rollback', () => {
  assert.deepEqual(pdf.healthcheck.test, ['CMD', 'test', '-S', '/run/pdf/pdf.sock']);
  for (const branch of roll.split(/\nelse\n/)) {
    const at = (s) => branch.indexOf(s);
    assert.ok(at('roll ayat-pdf') >= 0 && at('roll ayat-pdf') < at('roll ayat-api-a'), branch.slice(0, 80));
  }
  assert.match(rollback, /stop ayat-api-a ayat-api-b ayat-pdf/);
});

