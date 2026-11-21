// Secret scan (lane L05a): gitleaks, a pinned release binary checked by sha256, on every PR and push.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const read = (f) => readFileSync(fileURLToPath(new URL(`../../../${f}`, import.meta.url)), 'utf8');
const ci = parse(read('.github/workflows/ci.yml'));
const job = ci.jobs['secret-scan'];
const runs = () => (job?.steps ?? []).map((s) => s.run ?? '').join('\n');

test('ci runs on pull requests and pushes to develop', () => {
  assert.ok('pull_request' in ci.on);
  assert.ok(ci.on.push.branches.includes('develop'));
});

test('the secret-scan job exists, always runs and reads no secret', () => {
  assert.ok(job, 'jobs.secret-scan is missing');
  assert.equal(job.if, undefined, 'the scan must never be skipped');
  assert.doesNotMatch(JSON.stringify(job), /secrets\./);
  assert.equal(job.steps[0].with?.['fetch-depth'], 0);
});

test('gitleaks is a pinned release binary verified by sha256, no third-party action', () => {
  const env = job.env ?? {};
  assert.match(String(env.GITLEAKS_VERSION), /^\d+\.\d+\.\d+$/);
  assert.match(String(env.GITLEAKS_SHA256), /^[0-9a-f]{64}$/);
  const run = runs();
  assert.match(run, /releases\/download\/v\$GITLEAKS_VERSION\/gitleaks_\$\{GITLEAKS_VERSION\}_linux_x64/);
  assert.match(run, /echo "\$GITLEAKS_SHA256 {2}[^"]*" \| sha256sum -c -/);
  const actions = job.steps.map((s) => s.uses).filter(Boolean);
  assert.ok(actions.every((u) => u.startsWith('actions/')), actions.join());
});

test('the scan covers the PR range or the pushed range and fails on a finding', () => {
  const run = runs();
  assert.match(run, /origin\/\$BASE_REF\.\.HEAD/);
  assert.match(run, /\$BEFORE\.\.\$AFTER/);
  assert.match(run, /gitleaks"? git [^\n]*--config \.gitleaks\.toml/);
  assert.match(run, /--redact/);
  assert.doesNotMatch(run, /--exit-code[= ]0/);
});

test('the required check aggregate needs and tests the secret-scan job', () => {
  assert.ok(ci.jobs.check.needs.includes('secret-scan'));
  const run = ci.jobs.check.steps.map((s) => s.run ?? '').join('\n');
  assert.match(run, /test "\$SECRET_SCAN" = success/);
});

test('.gitleaks.toml extends the default rules and adds the file-name rules', () => {
  const toml = read('.gitleaks.toml');
  assert.match(toml, /\[extend\]\s*\nuseDefault = true/);
  for (const id of ['key-file', 'keystore-file', 'env-file', 'service-account-file']) {
    assert.match(toml, new RegExp(`id = "${id}"`), id);
  }
});

test('.gitignore keeps key files, keystores and env files out', () => {
  const lines = read('.gitignore').split('\n');
  const want = [
    'deploy_key*', '*.pem', '*.key', 'id_rsa*', 'id_ed25519*', '*.keystore', '*.jks',
    'google-services.json', 'service-account*.json', '.env.*', '!.env.example',
  ];
  for (const w of want) assert.ok(lines.includes(w), w);
});
