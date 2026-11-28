import { posix } from 'node:path';
import type { Move } from '../map/index.ts';
import type { Rule } from './plan.types.ts';

const FILE_WEIGHT = 1_000_000;
const depth = (dir: string): number => dir.split('/').length;
const globRe = (pattern: string): RegExp =>
  new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')}$`);

const dirRule = (m: Move, index: number): Rule => ({
  from: m.from,
  to: m.to,
  index,
  weight: 2 * depth(m.from.slice(0, -1)),
  match: (file) =>
    file.startsWith(m.from) ? posix.join(m.to, file.slice(m.from.length)) : undefined,
});

const intoFolder = (to: string, file: string): string =>
  to.endsWith('/') ? posix.join(to, posix.basename(file)) : to;

const fileRule = (m: Move, index: number): Rule => ({
  from: m.from,
  to: m.to,
  index,
  weight: FILE_WEIGHT,
  match: (file) => (file === m.from ? intoFolder(m.to, file) : undefined),
});

/** `dir/stem.*` takes the stem's files and its `tests/` and `__snapshots__/` companions. */
function globRule(m: Move, index: number): Rule {
  const dir = posix.dirname(m.from);
  const re = globRe(posix.basename(m.from));
  const homes = ['', 'tests', '__snapshots__', 'tests/__snapshots__'];
  return {
    from: m.from,
    to: m.to,
    index,
    weight: 2 * depth(dir) + 1,
    match: (file) => {
      const home = homes.find((h) => posix.dirname(file) === posix.join(dir, h));
      if (home === undefined || !re.test(posix.basename(file))) return undefined;
      return posix.join(m.to, home, posix.basename(file));
    },
  };
}

const KINDS: [(from: string) => boolean, (m: Move, index: number) => Rule][] = [
  [(from) => from.endsWith('/'), dirRule],
  [(from) => from.includes('*'), globRule],
];

export function rulesOf(moves: readonly Move[]): Rule[] {
  return moves.map((m, i) => {
    const make = KINDS.find(([test]) => test(m.from))?.[1] ?? fileRule;
    return make(m, i);
  });
}

export const targetOf = (rule: Rule | undefined, file: string): string | undefined =>
  rule?.match(file);

/** The rules that take `file` with the highest weight: one is a clean pick, two or more tie. */
export function bestRule(rules: readonly Rule[], file: string): Rule[] {
  const hits = rules.filter((r) => r.match(file) !== undefined);
  const top = Math.max(...hits.map((r) => r.weight));
  return hits.filter((r) => r.weight === top);
}
