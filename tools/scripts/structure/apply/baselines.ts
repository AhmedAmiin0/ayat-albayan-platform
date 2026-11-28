import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { posix } from 'node:path';
import { z } from 'zod';
import { parseJson } from '../../units/json.ts';
import { follow } from '../tree/follow.ts';
import type { Moves } from '../tree/tree.types.ts';

const CAP_DIR = 'refactor/folder-cap';
const UNITS = 'refactor/guards/units.json';
const MAX = 12;
const capSchema = z.record(z.string(), z.object({ files: z.number(), dirs: z.number() }));
const unitsSchema = z.record(z.string(), z.number());

const save = (file: string, value: unknown): void =>
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

/** Folder keys follow their folder; a key whose folder split up or emptied is dropped. */
export function rekey<T>(table: Record<string, T>, moves: Moves): Record<string, T> {
  return Object.fromEntries(
    Object.entries(table).flatMap(([dir, v]) => {
      const to = follow(dir, moves);
      return to === undefined ? [] : [[to, v]];
    }),
  );
}

function countOf(root: string, dir: string): { files: number; dirs: number } | undefined {
  const abs = posix.join(root, dir);
  if (!existsSync(abs)) return undefined;
  const entries = readdirSync(abs, { withFileTypes: true });
  const code = /\.[cm]?[jt]sx?$/;
  const test = /\.(test|spec)\.[cm]?[jt]sx?$/;
  return {
    files: entries.filter((e) => e.isFile() && code.test(e.name) && !test.test(e.name)).length,
    dirs: entries.filter((e) => e.isDirectory() && e.name !== '__snapshots__').length,
  };
}

/** The folder-cap allow-lists and the units baseline after the moves: renamed, stale ones gone. */
export function updateBaselines(root: string, moves: Moves): void {
  for (const name of readdirSync(posix.join(root, CAP_DIR))) {
    const file = posix.join(root, CAP_DIR, name);
    const table = rekey(parseJson(readFileSync(file, 'utf8'), capSchema), moves);
    const kept = Object.entries(table).filter(([dir, ok]) => {
      const now = countOf(root, dir);
      return now !== undefined && (now.files > MAX || now.dirs > MAX) && now.files <= ok.files && now.dirs <= ok.dirs;
    });
    save(file, Object.fromEntries(kept));
  }
  const units = posix.join(root, UNITS);
  save(units, rekey(parseJson(readFileSync(units, 'utf8'), unitsSchema), moves));
}
