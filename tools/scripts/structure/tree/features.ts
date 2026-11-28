import { posix } from 'node:path';
import type { Domain, Layer } from '../map/index.ts';
import { closest } from './closest.ts';
import { foldersOf } from './folders.ts';
import { allowedTree } from './allowed.ts';
import type { Allowed } from './tree.types.ts';

const INDEX = /^index\.tsx?$/;

interface Scope {
  layer: Layer;
  allowed: Allowed;
  folders: Set<string>;
  files: readonly string[];
}

const childDirs = (folders: Set<string>, dir: string): string[] =>
  [...folders].filter((d) => posix.dirname(d) === dir).sort();
const childFiles = (files: readonly string[], dir: string): string[] =>
  files.filter((f) => posix.dirname(f) === dir).map((f) => posix.basename(f));

function unknown(dir: string, allowed: readonly string[]): string {
  return `not a listed name: ${dir} (closest: ${closest(posix.basename(dir), allowed)})`;
}

function featureIndex(s: Scope, dir: string): string[] {
  const has = childFiles(s.files, dir).some((n) => INDEX.test(n));
  return has ? [] : [`feature without index.ts: ${dir}`];
}

function groupProblems(s: Scope, dir: string, features: readonly string[]): string[] {
  const extra = s.layer.alias ? [] : ['index.ts'];
  const loose = childFiles(s.files, dir).filter((n) => !extra.includes(n));
  return [
    ...loose.map((n) => `file in a group: ${dir}/${n}`),
    ...childDirs(s.folders, dir).flatMap((d) =>
      features.includes(posix.basename(d)) ? featureIndex(s, d) : [unknown(d, features)],
    ),
  ];
}

function domainProblems(s: Scope, dir: string): string[] {
  const d = s.allowed.get(posix.basename(dir));
  if (d === undefined) return [];
  const names = ['tests', ...d.features, ...d.groups.keys()];
  return [
    ...childFiles(s.files, dir).map((n) => `file at domain level: ${dir}/${n}`),
    ...childDirs(s.folders, dir).flatMap((sub) => {
      const name = posix.basename(sub);
      const group = d.groups.get(name);
      if (group !== undefined) return groupProblems(s, sub, group);
      if (d.features.includes(name)) return featureIndex(s, sub);
      return name === 'tests' ? [] : [unknown(sub, names)];
    }),
  ];
}

/** docs/68 rules 1, 2 and 4 for one layer: listed domains, groups and features with index.ts. */
export function featureProblems(
  files: readonly string[],
  layer: Layer,
  domains: readonly Domain[],
): string[] {
  const inside = files.filter((f) => f.startsWith(`${layer.root}/`));
  const s: Scope = {
    layer,
    allowed: allowedTree(domains),
    folders: foldersOf(inside),
    files: inside,
  };
  const top = [...s.allowed.keys(), ...layer.extras];
  return childDirs(s.folders, layer.root).flatMap((dir) => {
    const name = posix.basename(dir);
    if (s.allowed.has(name)) return domainProblems(s, dir);
    return layer.extras.includes(name) ? [] : [unknown(dir, top)];
  });
}
