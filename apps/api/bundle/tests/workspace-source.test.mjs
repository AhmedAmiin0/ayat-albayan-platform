import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { sourceEntry, workspaceSource } from '../workspace-source.mjs';

const manifest = {
  name: '@ab/x',
  exports: {
    '.': { types: './dist/index.d.ts', default: './dist/index.js' },
    './seed': { types: './dist/seed/index.d.ts', default: './dist/seed/index.js' },
    './i18n/ar.json': './i18n/ar.json',
  },
};

describe('sourceEntry', () => {
  it('maps a built entry back to its TypeScript source', () => {
    expect(sourceEntry(manifest, '.')).toBe('./src/index.ts');
    expect(sourceEntry(manifest, './seed')).toBe('./src/seed/index.ts');
  });

  it('keeps a file entry that is not built', () => {
    expect(sourceEntry(manifest, './i18n/ar.json')).toBe('./i18n/ar.json');
  });

  it('has nothing for a subpath the package does not export', () => {
    expect(sourceEntry(manifest, './missing')).toBeNull();
    expect(sourceEntry({ name: '@ab/y' }, '.')).toBeNull();
  });
});

function workspace() {
  const root = mkdtempSync(join(tmpdir(), 'ws-'));
  mkdirSync(join(root, 'packages/x'), { recursive: true });
  mkdirSync(join(root, 'packages/no-manifest'), { recursive: true });
  writeFileSync(join(root, 'packages/x/package.json'), JSON.stringify(manifest));
  return root;
}

describe('workspaceSource', () => {
  const resolve = (id) => workspaceSource(join(workspace(), 'packages')).resolveId(id);

  it('resolves a workspace package and its subpaths to source files', () => {
    expect(resolve('@ab/x')).toMatch(/packages\/x\/src\/index\.ts$/);
    expect(resolve('@ab/x/seed')).toMatch(/packages\/x\/src\/seed\/index\.ts$/);
    expect(resolve('@ab/x/i18n/ar.json')).toMatch(/packages\/x\/i18n\/ar\.json$/);
  });

  it('leaves every other import to the default resolution', () => {
    expect(resolve('@ab/unknown')).toBeNull();
    expect(resolve('@ab/x/missing')).toBeNull();
    expect(resolve('@nestjs/core')).toBeNull();
    expect(resolve('./local')).toBeNull();
  });
});
