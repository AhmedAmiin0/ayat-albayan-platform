// `pnpm guard:escapes`: fails on any inline escape comment (escapes.mjs) in the tracked code of
// apps/, packages/, tools/, e2e/ and docs/design/brand/tools/. Fix the code instead (docs/59).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { escapesOf, inScope, mayHold } from './escapes.mjs';

/** `file:line comment` for every escape under `root`. */
export function escapesIn(root) {
  // The tracked list is past execFileSync's 1 MiB default buffer.
  const options = { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 };
  const tracked = execFileSync('git', ['ls-files'], options);
  return tracked
    .split('\n')
    .filter((path) => inScope(path) && existsSync(join(root, path)))
    .map((path) => ({ path, text: readFileSync(join(root, path), 'utf8') }))
    .filter(({ text }) => mayHold(text))
    .flatMap(({ path, text }) =>
      escapesOf(text, path).map((e) => `${path}:${e.line} ${e.comment}`),
    );
}

function main() {
  const root = fileURLToPath(new URL('../../../../..', import.meta.url));
  const found = escapesIn(root);
  console.log(`escapes: ${found.length} inline escape comments (fix the code, docs/59)`);
  for (const line of found) console.log(`  ${line}`);
  process.exitCode = found.length > 0 ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
