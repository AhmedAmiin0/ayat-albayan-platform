import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { apiFiles, apiInputs, IMAGE_FILES, packageClosure } from './api-inputs.ts';

const REPO = fileURLToPath(new URL('../../../..', import.meta.url));

/** A workspace of `{ folder: [name, workspace deps, workspace devDeps] }`. */
function workspace(pkgs: Record<string, [string, string[], string[]]>): string {
  const root = mkdtempSync(join(tmpdir(), 'api-inputs-'));
  const ws = (names: string[]) => Object.fromEntries(names.map((n) => [n, 'workspace:*']));
  for (const [dir, [name, deps, dev]] of Object.entries(pkgs)) {
    mkdirSync(join(root, dir), { recursive: true });
    const manifest = { name, dependencies: { zod: '^4', ...ws(deps) }, devDependencies: ws(dev) };
    writeFileSync(join(root, dir, 'package.json'), JSON.stringify(manifest));
  }
  return root;
}

test('the closure follows dependencies and devDependencies, once each, nothing else', () => {
  const root = workspace({
    'apps/api': ['api', ['@ab/shared'], ['@ab/config']],
    'apps/staff-web': ['staff-web', ['@ab/shared', '@ab/web-kit'], []],
    'packages/shared': ['@ab/shared', ['@ab/core', '@ab/db'], ['@ab/config']],
    'packages/core': ['@ab/core', [], []],
    'packages/db': ['@ab/db', [], ['@ab/config']],
    'packages/config': ['@ab/config', [], []],
    'packages/web-kit': ['@ab/web-kit', [], []],
    'tools/scripts': ['@ab/scripts', ['@ab/shared'], []],
  });
  assert.deepEqual(packageClosure(root, 'api'), [
    'apps/api',
    'packages/config',
    'packages/core',
    'packages/db',
    'packages/shared',
  ]);
});

test('this repository: the api, its packages and the image files; never the web apps', () => {
  const inputs = apiInputs(REPO);
  for (const dir of ['apps/api/', 'packages/shared/', 'packages/db/', 'packages/config/'])
    assert.ok(inputs.includes(dir), dir);
  for (const dir of ['apps/staff-web/', 'apps/family-web/', 'apps/staff-mobile/', 'e2e/'])
    assert.ok(!inputs.includes(dir), dir);
  assert.ok(IMAGE_FILES.every((file) => inputs.includes(file)));
});

test('folders match by prefix, files exactly', () => {
  const inputs = ['apps/api/', 'pnpm-lock.yaml', 'packages/catalog/brand/'];
  const changed = [
    'apps/api/Dockerfile',
    'apps/api-gateway/x.ts',
    'pnpm-lock.yaml',
    'pnpm-lock.yaml.bak',
    'packages/catalog/brand/mark.png',
    'apps/staff-web/src/a.tsx',
  ];
  assert.deepEqual(apiFiles(changed, inputs), [
    'apps/api/Dockerfile',
    'pnpm-lock.yaml',
    'packages/catalog/brand/mark.png',
  ]);
});
