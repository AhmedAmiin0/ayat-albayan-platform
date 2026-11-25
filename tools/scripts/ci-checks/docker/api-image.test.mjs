// apps/api/Dockerfile layer order and ci.yml job «image» (ci/api-image-cache, 2026-11-17): the VPS
// rebuilds only what a deploy changed, and CI builds the same image whenever its inputs change.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const read = (p) =>
  readFileSync(fileURLToPath(new URL(`../../../../${p}`, import.meta.url)), 'utf8');
const dockerfile = read('apps/api/Dockerfile');
const ci = parse(read('.github/workflows/ci.yml'));
const diff = ci.jobs.changes.steps.find((s) => s.id === 'diff').run;
const IMAGE_PATHS = new RegExp(/IMAGE_PATHS='([^']+)'/.exec(diff)?.[1] ?? '$^');

test("the Chromium of the lockfile: PLAYWRIGHT_CORE equals the api importer's playwright-core", () => {
  const lock = read('pnpm-lock.yaml');
  const api = lock.slice(
    lock.indexOf('\n  apps/api:'),
    lock.indexOf('\n  apps/', lock.indexOf('\n  apps/api:') + 1),
  );
  const locked = /\n {6}playwright-core:\n {8}specifier: [^\n]+\n {8}version: ([\d.]+)/.exec(
    api,
  )?.[1];
  assert.equal(/^ARG PLAYWRIGHT_CORE=([\d.]+)$/m.exec(dockerfile)?.[1], locked);
});

test('apt + Chromium first, then the manifests, pnpm fetch, and only then the source', () => {
  const at = (s) => dockerfile.indexOf(s);
  assert.ok(at('install --with-deps --only-shell chromium') < at('AS manifests'));
  assert.ok(at('\n    pnpm fetch') > at('COPY --from=manifests /repo ./'));
  assert.ok(at('\n    pnpm fetch') < at('\nCOPY . .'));
  assert.match(
    dockerfile,
    /pnpm install --offline --frozen-lockfile --store-dir \/pnpm\/store --filter "api\.\.\."/,
  );
  assert.equal(
    dockerfile.match(/--mount=type=cache,id=ayat-pnpm-store,target=\/pnpm\/store/g)?.length,
    2,
  );
  // Never --offline: the layer cache can hold «deps» while the store mount is empty.
  assert.match(
    dockerfile,
    /pnpm install --prefer-offline --frozen-lockfile --prod --store-dir \/pnpm\/store --filter "api\.\.\."/,
  );
});

test("the build stage never reinstalls: pnpm's pre-run install check is off before the source", () => {
  const build = dockerfile.slice(
    dockerfile.indexOf('AS build\n'),
    dockerfile.indexOf('\nCOPY . .'),
  );
  assert.match(build, /\nENV pnpm_config_verify_deps_before_run=false$/);
  const final = dockerfile.slice(dockerfile.lastIndexOf('\nFROM '));
  assert.doesNotMatch(final, /verify_deps/, "the runtime image keeps pnpm's defaults");
});

test('the runtime keeps its user, workdir, port, health check and command', () => {
  const final = dockerfile.slice(dockerfile.lastIndexOf('\nFROM '));
  assert.match(final, /^FROM runtime-base$/m);
  assert.match(final, /COPY --from=build --chown=node:node \/repo \/repo/);
  assert.match(final, /USER node\nWORKDIR \/repo\/apps\/api\nEXPOSE 3000\n/);
  assert.match(final, /CMD \["node", "dist\/main\.js"\]/);
  assert.match(dockerfile, /PLAYWRIGHT_BROWSERS_PATH=\/ms-playwright/);
});

test('IMAGE_PATHS: what the Dockerfile installs from, itself and deploy/ build the image; source does not', () => {
  const yes = [
    'apps/api/Dockerfile',
    '.dockerignore',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'package.json',
    '.npmrc',
    'apps/api/package.json',
    'packages/shared/package.json',
    'tools/scripts/package.json',
    'e2e/package.json',
    'docs/design/brand/tools/package.json',
    'patches/expo-sharing@57.0.24.patch',
    'apps/api/rolldown.config.mjs',
    'apps/api/bundle/entries.mjs',
    'apps/api/bundle/externals.mjs',
    'deploy/staging/docker-compose.yml',
    'deploy/staging/roll.sh',
    'deploy/evolution/README.md',
  ];
  const no = [
    'apps/api/src/main.ts',
    'apps/api/Dockerfile.bak',
    'apps/api/bundle/tests/entries.test.mjs',
    'apps/staff-web/src/x/package.json',
    'packages/shared/src/index.ts',
    'docs/09-deployment.md',
    'tools/scripts/ci-checks/x.mjs',
    '.github/workflows/ci.yml',
    'deploy',
    'x/deploy/a',
  ];
  for (const f of yes) assert.match(f, IMAGE_PATHS, f);
  for (const f of no) assert.doesNotMatch(f, IMAGE_PATHS, f);
  assert.match(
    diff,
    /full\(\) \{ printf 'e2e=true\\ncode=true\\nimage=true\\n'/,
    'fail safe: the image builds too',
  );
});

test('job «image»: buildx with the GitHub cache, then the PDFs and /health; in check only when it ran', () => {
  const job = ci.jobs.image;
  assert.equal(job.if, "needs.changes.outputs.image == 'true'");
  assert.equal(ci.jobs.changes.outputs.image, '${{ steps.diff.outputs.image }}');
  const build = job.steps.find((s) => s.id === 'build');
  assert.equal(build.with.file, 'apps/api/Dockerfile');
  assert.equal(build.with['cache-from'], 'type=gha,scope=api-image');
  assert.equal(build.with['cache-to'], 'type=gha,mode=max,scope=api-image');
  const runs = job.steps.map((s) => s.run ?? '').join('\n');
  assert.match(runs, /pdf-sandbox\.js/);
  assert.match(runs, /chromium\.launch\(\)/);
  assert.match(runs, /http:\/\/127\.0\.0\.1:3000\/health/);
  assert.ok(ci.jobs.check.needs.includes('image'));
  const check = ci.jobs.check.steps[0];
  assert.equal(check.env.IMAGE, '${{ needs.image.result }}');
  assert.match(check.run, /test "\$IMAGE" = success \|\| test "\$IMAGE" = skipped/);
});
