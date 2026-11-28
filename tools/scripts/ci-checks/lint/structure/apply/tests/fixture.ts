import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { posix } from 'node:path';

/** A made-up tree on disk: path → text. */
export function tree(files: Record<string, string>): string {
  const root = mkdtempSync(posix.join(tmpdir(), 'structure-'));
  for (const [f, text] of Object.entries(files)) {
    mkdirSync(posix.dirname(posix.join(root, f)), { recursive: true });
    writeFileSync(posix.join(root, f), text);
  }
  return root;
}
