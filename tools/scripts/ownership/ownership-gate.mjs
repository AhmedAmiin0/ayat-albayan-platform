// Id routes a teacher, family or sales login can call (refactor/guards/ownership.json) map to
// the test that sends them someone else's id, or to «unchecked». The api's ownership guard test
// keeps the list equal to the routes; this gate keeps the «unchecked» entries from growing
// against the base branch (GUARD_BASE, set by ci.yml «guards»), so the list only shrinks.
// Usage: [GUARD_BASE=<base checkout>] node tools/scripts/ownership/ownership-gate.mjs
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { z } from 'zod';
import { readJson } from '../ci-checks/lint/json-file.mjs';

const FILE = join('refactor', 'guards', 'ownership.json');
const UNCHECKED = 'unchecked';
const baselineSchema = z.record(z.string(), z.string());

const uncheckedOf = (baseline) => Object.keys(baseline).filter((k) => baseline[k] === UNCHECKED);

/** Head routes left «unchecked» that the base had checked or did not list. */
export function newUnchecked(head, base) {
  return uncheckedOf(head).filter((k) => base[k] !== UNCHECKED);
}

/** `{ lines, failed }` for the head baseline against the base one (undefined: none yet). */
export function decide(head, base) {
  const count = uncheckedOf(head).length;
  const was = base === undefined ? '-' : String(uncheckedOf(base).length);
  const added = base === undefined ? [] : newUnchecked(head, base);
  const lines = [`ownership: unchecked ${count} (base ${was}), new ${added.length}`];
  for (const k of added) lines.push(`  new unchecked: ${k} (add a test that sends another id)`);
  return { lines, failed: added.length > 0 };
}

const readIfAny = (path) => (existsSync(path) ? readJson(path, baselineSchema) : undefined);

function main() {
  const root = fileURLToPath(new URL('../../..', import.meta.url));
  const dir = process.env.GUARD_BASE;
  const base = dir === undefined || dir === '' ? undefined : readIfAny(join(dir, FILE));
  const { lines, failed } = decide(readJson(join(root, FILE), baselineSchema), base);
  for (const line of lines) console.log(line);
  if (failed) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
