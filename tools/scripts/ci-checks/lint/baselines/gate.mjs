// `pnpm guard:baselines`: on a PR (GUARD_BASE: the base branch checked out beside the head), every
// refactor/guards and refactor/folder-cap baseline may only shrink (shrink.mjs). The layer table
// refactor/guards/packages.json is no baseline: guard:packages warns when a PR widens it.
import { existsSync, globSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { z } from 'zod';
import { readJson } from '../json-file.mjs';
import { gitRenames, mover } from './renames.mjs';
import { grown } from './shrink.mjs';

const GLOBS = ['refactor/guards/*.json', 'refactor/folder-cap/*.json'];
const TABLE = 'refactor/guards/packages.json';
const counts = z.union([z.number(), z.record(z.string(), z.number())]);
const baseline = z.union([z.array(z.string()), z.record(z.string(), counts)]);

const read = (dir, name) => {
  const path = join(dir, name);
  return existsSync(path) ? readJson(path, baseline) : undefined;
};
const names = (dir) => globSync(GLOBS, { cwd: dir }).filter((name) => name !== TABLE).sort();

/** The failure lines of every baseline of the head at `root` against the base at `baseDir`. */
export function baselinesGate(root, baseDir) {
  const move = mover(gitRenames(root, baseDir), (dir) => !existsSync(join(root, dir)));
  return names(root).flatMap((name) =>
    grown(name, { base: read(baseDir, name), head: read(root, name) ?? [] }, move),
  );
}

function main() {
  const root = fileURLToPath(new URL('../../../../..', import.meta.url));
  const baseDir = process.env.GUARD_BASE;
  if (!baseDir) return console.log('baselines: no base branch given (GUARD_BASE), nothing to compare');
  const lines = baselinesGate(root, baseDir);
  console.log(`baselines: ${names(root).length} files against the base branch, ${lines.length} grew`);
  for (const line of lines) console.log(`  ${line}`);
  process.exitCode = lines.length > 0 ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
