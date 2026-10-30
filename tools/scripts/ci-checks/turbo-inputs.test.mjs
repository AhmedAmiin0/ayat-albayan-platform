// Turbo `inputs` (docs/32 §4.2, g4): a narrower hash must never replay a stale cached pass.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const MIGRATIONS = '$TURBO_ROOT$/packages/db/supabase/migrations/**';
const TEST = /\.test\.[cm]?[jt]sx?$/;
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const turboOf = (pkg) => {
  try {
    return json(`${pkg}/turbo.json`);
  } catch {
    return { tasks: {} };
  }
};
const testInputs = (pkg) => turboOf(pkg).tasks.test?.inputs ?? [];

function testFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) return [];
    const path = join(dir, e.name);
    if (e.isDirectory()) return testFiles(path);
    return TEST.test(e.name) ? [path] : [];
  });
}

const packages = ['apps', 'packages', 'tools'].flatMap((top) =>
  readdirSync(join(ROOT, top), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => `${top}/${e.name}`),
);

test('the root package has no workspace dependency but @ab/config (its files join the global hash)', () => {
  const root = json('package.json');
  const deps = { ...root.dependencies, ...root.devDependencies };
  const internal = Object.keys(deps).filter((d) => deps[d].startsWith('workspace:'));
  assert.deepEqual(internal, ['@ab/config']);
});

test('every package whose tests read the migrations hashes them into its test task', () => {
  const readers = packages.filter(
    (pkg) =>
      pkg !== 'packages/db' &&
      testFiles(join(ROOT, pkg)).some((f) =>
        readFileSync(f, 'utf8').includes('supabase/migrations'),
      ),
  );
  assert.ok(readers.includes('apps/api') && readers.includes('packages/shared'), readers.join());
  for (const pkg of readers) assert.ok(testInputs(pkg).includes(MIGRATIONS), pkg);
});

test('package test inputs extend the root inputs instead of replacing them', () => {
  for (const pkg of packages) {
    const inputs = testInputs(pkg);
    if (inputs.length) assert.equal(inputs[0], '$TURBO_EXTENDS$', pkg);
  }
});

// root(path) calls and new URL(../ path) literals → repo paths outside tools/scripts.
function outsideReads(file) {
  const text = readFileSync(file, 'utf8');
  const fromRoot = [...text.matchAll(/root\(['`]([^'`$]+)/g)].map((m) => m[1]);
  const fromUrl = [...text.matchAll(/new URL\(['`]((?:\.\.\/)+[^'`$]*)/g)].map((m) =>
    relative(ROOT, resolve(dirname(file), m[1])),
  );
  return [...fromRoot, ...fromUrl].filter((p) => p && !p.startsWith('tools/scripts'));
}

test('every repo file the @ab/scripts tests read is a test input', () => {
  const globs = testInputs('tools/scripts')
    .filter((g) => g.startsWith('$TURBO_ROOT$/'))
    .map((g) => g.slice('$TURBO_ROOT$/'.length));
  const covered = (p) =>
    globs.some((g) => (g.endsWith('/**') ? `${p}/`.startsWith(g.slice(0, -2)) : g === p));
  const reads = testFiles(join(ROOT, 'tools/scripts')).flatMap(outsideReads);
  assert.ok(reads.includes('deploy/staging/roll.sh'), 'the scan finds root() reads');
  assert.ok(reads.includes('.github/workflows/ci.yml'), 'the scan finds URL reads');
  assert.deepEqual([...new Set(reads.filter((p) => !covered(p)))], []);
});

test('the migrations leave the @ab/db build and typecheck hashes', () => {
  const { tasks } = turboOf('packages/db');
  for (const task of ['build', 'typecheck']) {
    const inputs = tasks[task]?.inputs ?? [];
    assert.ok(
      inputs.length && inputs.every((g) => !g.startsWith('$') && !g.startsWith('supabase')),
      task,
    );
  }
});

test('the build hash ignores tests, snapshots, fixtures and docs', () => {
  const { inputs } = json('turbo.json').tasks.build;
  for (const g of [
    '!**/*.test.ts',
    '!**/*.test.tsx',
    '!**/__snapshots__/**',
    '!**/fixtures/**',
    '!**/*.md',
  ])
    assert.ok(inputs.includes(g), g);
});
