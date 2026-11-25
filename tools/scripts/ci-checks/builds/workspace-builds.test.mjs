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

test("api image: installs api..., then bundles the api from the packages' source", () => {
  const dockerfile = read('apps/api/Dockerfile');
  // The install (stage deps, before the source) and the build (stage build) are separate layers.
  assert.match(
    dockerfile,
    /pnpm install --offline --frozen-lockfile --store-dir \/pnpm\/store --filter "api\.\.\."/,
  );
  const start = dockerfile.indexOf('AS build\n');
  const run = dockerfile.slice(start, dockerfile.indexOf('\nFROM', start));
  assert.match(run, /\nRUN pnpm --filter api build\n/);
  assert.doesNotMatch(
    run,
    /api\^\.\.\./,
    "the bundle reads the packages' source: no package build",
  );
  assert.doesNotMatch(run, NAMED_PACKAGE_BUILD, 'no hand-kept package list');
  assert.equal(
    JSON.parse(read('apps/api/package.json')).scripts.build,
    'rolldown -c rolldown.config.mjs',
  );
});

test('mobile EAS build: post-install builds staff-mobile^...', () => {
  const pkg = JSON.parse(read('apps/staff-mobile/package.json'));
  const script = pkg.scripts['eas-build-post-install'];
  assert.equal(script, 'pnpm --dir ../.. --filter "staff-mobile^..." build');
  assert.doesNotMatch(script, NAMED_PACKAGE_BUILD);
});

test('the pattern catches the old hand-kept lists', () => {
  assert.match('pnpm --filter @ab/shared build', NAMED_PACKAGE_BUILD);
  assert.match(
    'pnpm --dir ../.. --filter @ab/shared --filter @ab/client-core build',
    NAMED_PACKAGE_BUILD,
  );
  assert.doesNotMatch('pnpm --filter "staff-web^..." build', NAMED_PACKAGE_BUILD);
});

test('staging web deploy and the mobile OTA workflow build <app>^...', () => {
  const deploy = read('.github/workflows/deploy-staging.yml');
  assert.match(deploy, /pnpm --filter "staff-web\^\.\.\." build/);
  assert.doesNotMatch(deploy, NAMED_PACKAGE_BUILD);
  const mobile = read('.github/workflows/mobile.yml');
  assert.match(mobile, /pnpm --filter "staff-mobile\^\.\.\." build/);
  assert.doesNotMatch(mobile, NAMED_PACKAGE_BUILD);
});

test('the automatic OTA follows every package the app bundles, not packages/shared alone', () => {
  const deploy = read('.github/workflows/deploy-staging.yml');
  assert.match(deploy, /git diff --name-only "\$BASE" HEAD -- apps\/staff-mobile packages /);
});
