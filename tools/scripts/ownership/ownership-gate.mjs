// Every id route a teacher, family or sales login can call is mapped in
// apps/api/src/common/auth/ownership/owned-routes.json to the test that sends it someone else's
// id. The api test ownership.guard.test.ts fails on a walked route the map lacks; this gate fails
// on an entry that names no existing test file or a test that asserts no 403/404. No baseline.
// Usage: node tools/scripts/ownership/ownership-gate.mjs
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { z } from 'zod';
import { readJson } from '../ci-checks/lint/json-file.mjs';

const FILE = join('apps', 'api', 'src', 'common', 'auth', 'ownership', 'owned-routes.json');
const testFile = z.string().regex(/^apps\/api\/src\/.+\.test\.ts$/);
export const mapSchema = z.record(z.string().regex(/^[A-Z]+ \/\S*:\S*$/), testFile);
const DENIAL = /\b40[34]\b|ForbiddenException|NotFoundException/;

const problemOf = (read) => (file) => {
  const text = read(file);
  const reasons = { missing: text === undefined, 'asserts no 403/404': !DENIAL.test(text ?? '') };
  return Object.keys(reasons).find((k) => reasons[k]);
};

/** `{ lines, failed }` for the map; `read(file)` gives a test file's text or undefined. */
export function decide(map, read) {
  const problem = problemOf(read);
  const bad = Object.entries(map).flatMap(([route, file]) => {
    const why = problem(file);
    return why === undefined ? [] : [`  ${route}: ${file} (${why})`];
  });
  const lines = [`ownership: ${Object.keys(map).length} id routes mapped, ${bad.length} broken`];
  return { lines: [...lines, ...bad], failed: bad.length > 0 };
}

function main() {
  const root = fileURLToPath(new URL('../../..', import.meta.url));
  const read = (f) => (existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8') : undefined);
  const { lines, failed } = decide(readJson(join(root, FILE), mapSchema), read);
  for (const line of lines) console.log(line);
  if (failed) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
