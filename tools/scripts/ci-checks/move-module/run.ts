import { existsSync, readdirSync } from 'node:fs';
import { posix } from 'node:path';
import { barrelText } from './barrels.ts';
import { codeFiles, moveFiles, readText, rewriteText, textFiles, writeIfChanged } from './files.ts';
import { expandMap, readMap, writeMap, type MoveMap } from './map.ts';
import { loadAliases, type Resolver } from './resolve.ts';
import { needles, newProject, rewriteFile } from './rewrite.ts';

export interface RunReport {
  id: string;
  moved: number;
  rewritten: number;
}

/** The map's file list: the one it recorded, or its patterns expanded now (and recorded). */
function filesOf(root: string, mapFile: string): { map: MoveMap; pairs: [string, string][] } {
  const map = readMap(posix.join(root, mapFile));
  if (map.files !== undefined) return { map, pairs: map.files };
  const pairs = expandMap(root, map);
  const recorded = { ...map, files: pairs };
  writeMap(posix.join(root, mapFile), recorded);
  return { map: recorded, pairs };
}

function rewriteAll(root: string, r: Resolver, pairs: [string, string][]): number {
  const project = newProject();
  const keys = needles(r.renamed);
  let count = 0;
  for (const file of codeFiles(root)) {
    const text = readText(root, file);
    if (!r.renamed.has(file) && !keys.some((k) => text.includes(k))) continue;
    if (writeIfChanged(root, file, rewriteFile(project, r, { file, text }))) count += 1;
  }
  for (const file of textFiles(root)) {
    if (writeIfChanged(root, file, rewriteText(readText(root, file), pairs))) count += 1;
  }
  return count;
}

/** Applies one move map: rewrites every specifier and path reference, moves the files, writes barrels. */
export function runMap(root: string, mapFile: string): RunReport {
  const { map, pairs } = filesOf(root, mapFile);
  const pending = pairs.filter(([from]) => existsSync(posix.join(root, from)));
  const r: Resolver = { root, aliases: loadAliases(root), renamed: new Map(pairs) };
  const rewritten = rewriteAll(root, r, pairs);
  moveFiles(root, pending);
  const project = newProject();
  for (const barrel of map.barrels ?? []) {
    writeIfChanged(root, posix.join(barrel.dir, 'index.ts'), barrelText(project, root, barrel));
  }
  return { id: map.id, moved: pending.length, rewritten };
}

/** Every committed map in `refactor/moves/`, in `seq` order: an open branch follows all the moves. */
export function replay(root: string): RunReport[] {
  const dir = posix.join(root, 'refactor', 'moves');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => n.endsWith('.json'))
    .map((n) => ({ file: posix.join('refactor', 'moves', n), seq: readMap(posix.join(dir, n)).seq }))
    .sort((a, b) => a.seq - b.seq)
    .map(({ file }) => runMap(root, file));
}
