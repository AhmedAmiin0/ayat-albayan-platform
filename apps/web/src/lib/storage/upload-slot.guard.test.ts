import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Every direct upload goes through upload-slot.ts (docs/45): it routes by the storage marker.
const SRC = join(process.cwd(), 'src'); // vitest runs from apps/web
const HELPER = join('lib', 'storage', 'upload-slot.ts');
const FORBIDDEN = /uploadToSignedUrl|\.storage\s*\.from\(/;
const isTest = (name: string) => /\.test\.tsx?$|-fixture\.tsx?$/.test(name);
const isCode = (name: string) => /\.tsx?$/.test(name) && !isTest(name);

function codeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return codeFiles(path);
    return isCode(e.name) ? [path] : [];
  });
}

describe('direct uploads', () => {
  it('scans the app', () => {
    expect(codeFiles(SRC).map((path) => relative(SRC, path))).toContain(HELPER);
  });

  it('only upload-slot.ts talks to Supabase Storage', () => {
    const offenders = codeFiles(SRC)
      .map((path) => relative(SRC, path))
      .filter((path) => path !== HELPER && FORBIDDEN.test(readFileSync(join(SRC, path), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
