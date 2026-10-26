import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { posix } from 'node:path';

/** A throw-away monorepo: `{ 'apps/web/src/a.ts': 'text' }` → its root folder. */
export function makeRepo(files: Record<string, string>): string {
  const root = mkdtempSync(posix.join(tmpdir(), 'move-module-'));
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(posix.dirname(posix.join(root, file)), { recursive: true });
    writeFileSync(posix.join(root, file), text);
  }
  return root;
}

/** Every file of the repo with its text, for exact before/after comparisons. */
export function snapshot(root: string, dir = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of readdirSync(posix.join(root, dir))) {
    const rel = dir === '' ? name : posix.join(dir, name);
    if (statSync(posix.join(root, rel)).isDirectory()) Object.assign(out, snapshot(root, rel));
    else out[rel] = readFileSync(posix.join(root, rel), 'utf8');
  }
  return out;
}

export const map = (body: object): string => JSON.stringify({ id: 't', seq: 1, ...body });
