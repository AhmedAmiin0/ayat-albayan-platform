// docs/32 «Critic corrections» 8: lane K cuts @ab/shared into several packages, each with dist/.
// A build list naming packages one by one breaks the api image and every APK on the first cut,
// so these builds select every workspace dependency of the app (pnpm `<app>^...`, in order).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = (p) => fileURLToPath(new URL(`../../../../${p}`, import.meta.url));
const read = (p) => readFileSync(root(p), 'utf8');
const NAMED_PACKAGE_BUILD = /--filter\s+@ab\/[\w-]+(?:\s+--filter\s+@ab\/[\w-]+)*\s+build/;

test('api image: installs api..., builds api^... before the api itself', () => {
  const dockerfile = read('apps/api/Dockerfile');
  const start = dockerfile.indexOf('RUN pnpm install');
  const run = dockerfile.slice(start, dockerfile.indexOf('\nFROM', start));
  assert.match(run, /pnpm install --frozen-lockfile --filter "api\.\.\."/);
  const deps = run.indexOf('pnpm --filter "api^..." build');
  const api = run.indexOf('pnpm --filter api build');
  assert.ok(deps > 0, 'builds every workspace dependency of the api');
  assert.ok(api > deps, 'the api builds after its dependencies');
  assert.doesNotMatch(run, NAMED_PACKAGE_BUILD, 'no hand-kept package list');
});

test('mobile EAS build: post-install builds mobile^...', () => {
  const pkg = JSON.parse(read('apps/mobile/package.json'));
  const script = pkg.scripts['eas-build-post-install'];
  assert.equal(script, 'pnpm --dir ../.. --filter "mobile^..." build');
  assert.doesNotMatch(script, NAMED_PACKAGE_BUILD);
});

test('the pattern catches the old hand-kept lists', () => {
  assert.match('pnpm --filter @ab/shared build', NAMED_PACKAGE_BUILD);
  assert.match('pnpm --dir ../.. --filter @ab/shared --filter @ab/client-core build', NAMED_PACKAGE_BUILD);
  assert.doesNotMatch('pnpm --filter "web^..." build', NAMED_PACKAGE_BUILD);
});

test('staging web deploy and the mobile OTA workflow build <app>^...', () => {
  const deploy = read('.github/workflows/deploy-staging.yml');
  assert.match(deploy, /pnpm --filter "web\^\.\.\." build/);
  assert.doesNotMatch(deploy, NAMED_PACKAGE_BUILD);
  const mobile = read('.github/workflows/mobile.yml');
  assert.match(mobile, /pnpm --filter "mobile\^\.\.\." build/);
  assert.doesNotMatch(mobile, NAMED_PACKAGE_BUILD);
});

test('the automatic OTA follows every package the app bundles, not packages/shared alone', () => {
  const deploy = read('.github/workflows/deploy-staging.yml');
  assert.match(deploy, /git diff --name-only "\$BASE" HEAD -- apps\/mobile packages /);
});
