import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { API_SRC, findRepoRoot, MIGRATIONS_DIR, migrationPath, REPO_ROOT } from './repo-paths.test-util';

describe('repo paths for tests', () => {
  it('finds the monorepo root from this folder', () => {
    expect(existsSync(join(REPO_ROOT, 'pnpm-workspace.yaml'))).toBe(true);
    expect(existsSync(join(API_SRC, 'main.ts'))).toBe(true);
  });

  it('points at the real migrations', () => {
    expect(existsSync(MIGRATIONS_DIR)).toBe(true);
    expect(migrationPath('x.sql')).toBe(join(MIGRATIONS_DIR, 'x.sql'));
  });

  it('walks up any depth and stops at the first workspace file', () => {
    const root = mkdtempSync(join(tmpdir(), 'repo-root-'));
    writeFileSync(join(root, 'pnpm-workspace.yaml'), '');
    const deep = join(root, 'a', 'b', 'c');
    mkdirSync(deep, { recursive: true });
    expect(findRepoRoot(deep)).toBe(root);
    expect(findRepoRoot(root)).toBe(root);
  });

  it('throws when no workspace file is above', () => {
    expect(() => findRepoRoot(tmpdir())).toThrow(/pnpm-workspace\.yaml not found/);
  });
});
