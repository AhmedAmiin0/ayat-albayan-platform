import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// docs/45 rule 1: every file goes through StorageService (the port); only the Supabase adapter
// talks to Supabase Storage. A new direct call anywhere else fails here.

const SRC = join(__dirname, '..', '..');
const ALLOWED = new Set(['common/storage/store/objects.supabase.ts']);
const DIRECT = /\.storage\s*\.\s*from\s*\(|\bdb\s*\.\s*storage\b|createSigned(Upload)?Urls?\s*\(/;

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    return e.isDirectory() ? files(path) : [path];
  });
}

const code = (path: string): boolean =>
  path.endsWith('.ts') && !/\.(test|fakes)\.ts$|test-app\.ts$/.test(path);

describe('no direct Supabase Storage call outside its adapter', () => {
  it('only store/objects.supabase.ts calls db.storage', () => {
    const offenders = files(SRC)
      .filter(code)
      .map((path) => relative(SRC, path))
      .filter((rel) => !ALLOWED.has(rel) && DIRECT.test(readFileSync(join(SRC, rel), 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('the pattern catches a direct call', () => {
    expect(DIRECT.test('await this.db.storage.from(bucket).upload(path, body)')).toBe(true);
    expect(DIRECT.test('await this.storage.upload({ bucket, path })')).toBe(false);
  });
});
