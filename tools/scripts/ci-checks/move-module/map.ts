import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { posix } from 'node:path';

/** One line of a move map: a file, a `dir/` (moved whole) or a one-folder glob (`dir/meta-*`). */
export interface MoveEntry {
  from: string;
  to: string;
}
export interface BarrelEntry {
  dir: string;
  files: string[];
}
/** `refactor/moves/<id>.json`. `files` is written by the first run, so a replay works once the sources are gone. */
export interface MoveMap {
  id: string;
  seq: number;
  moves: MoveEntry[];
  barrels?: BarrelEntry[];
  files?: [string, string][];
  /**
   * Identifier renames applied across the monorepo with the move (`{ "XQueries": "XRepo" }`, D2). They stay
   * active on every replay: an old name a branch adds later is renamed too.
   */
  renames?: Record<string, string>;
}

const TEST = /\.(test|spec)\.[cm]?[jt]sx?$/;
const CODE = /\.[cm]?[jt]sx?$/;
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.turbo', '.expo']);

export const isTest = (file: string): boolean => TEST.test(file);

export function readMap(file: string): MoveMap {
  const map = JSON.parse(readFileSync(file, 'utf8')) as MoveMap;
  if (typeof map.id !== 'string' || typeof map.seq !== 'number' || !Array.isArray(map.moves)) {
    throw new Error(`${file}: a move map needs id, seq and moves`);
  }
  return map;
}

export function writeMap(file: string, map: MoveMap): void {
  const text = `${JSON.stringify(map, null, 2)}\n`;
  if (!existsSync(file) || readFileSync(file, 'utf8') !== text) writeFileSync(file, text);
}

function walk(root: string, dir: string): string[] {
  return readdirSync(posix.join(root, dir), { withFileTypes: true }).flatMap((d) => {
    const rel = posix.join(dir, d.name);
    if (d.isDirectory()) return SKIP_DIRS.has(d.name) ? [] : walk(root, rel);
    return [rel];
  });
}

const globRe = (pattern: string): RegExp =>
  new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')}$`);

function expandEntry(root: string, entry: MoveEntry): [string, string][] {
  const { from, to } = entry;
  if (from.endsWith('/')) {
    if (!existsSync(posix.join(root, from))) return [];
    return walk(root, from.slice(0, -1)).map((f) => [f, posix.join(to, f.slice(from.length))]);
  }
  if (from.includes('*')) {
    const dir = posix.dirname(from);
    if (!existsSync(posix.join(root, dir))) return [];
    const re = globRe(posix.basename(from));
    return readdirSync(posix.join(root, dir))
      .filter((n) => re.test(n) && statSync(posix.join(root, dir, n)).isFile())
      .map((n) => [posix.join(dir, n), posix.join(to, n)]);
  }
  return [[from, to.endsWith('/') ? posix.join(to, posix.basename(from)) : to]];
}

/** `foo.ts` brings `foo.test.ts(x)`, `foo.spec.*` (renamed with its stem); every test brings its `__snapshots__/<test>.snap`. */
function companions(root: string, pair: [string, string]): [string, string][] {
  const [from, to] = pair;
  const dir = posix.dirname(from);
  const out: [string, string][] = [];
  const names = existsSync(posix.join(root, dir)) ? readdirSync(posix.join(root, dir)) : [];
  if (CODE.test(from) && !isTest(from)) {
    const stem = posix.basename(from).replace(CODE, '');
    const newStem = posix.basename(to).replace(CODE, '');
    for (const n of names) {
      if (isTest(n) && n.replace(TEST, '') === stem) {
        out.push([posix.join(dir, n), posix.join(posix.dirname(to), newStem + n.slice(stem.length))]);
      }
    }
  }
  for (const [f, t] of [pair, ...out]) {
    if (!isTest(f)) continue;
    const snap = posix.join(posix.dirname(f), '__snapshots__', `${posix.basename(f)}.snap`);
    const snapTo = posix.join(posix.dirname(t), '__snapshots__', `${posix.basename(t)}.snap`);
    if (existsSync(posix.join(root, snap))) out.push([snap, snapTo]);
  }
  return out;
}

/** Every file pair the map moves (sources that exist today), with tests and snapshots. */
export function expandMap(root: string, map: MoveMap): [string, string][] {
  const pairs = new Map<string, string>();
  for (const entry of map.moves) {
    for (const pair of expandEntry(root, entry)) {
      for (const [f, t] of [pair, ...companions(root, pair)]) {
        const seen = pairs.get(f);
        if (seen !== undefined && seen !== t) throw new Error(`${f} is moved twice (${seen}, ${t})`);
        pairs.set(f, t);
      }
    }
  }
  const targets = new Set<string>();
  for (const t of pairs.values()) {
    if (targets.has(t)) throw new Error(`two files move to ${t}`);
    targets.add(t);
  }
  return [...pairs].filter(([f]) => existsSync(posix.join(root, f))).sort(([a], [b]) => a.localeCompare(b));
}
