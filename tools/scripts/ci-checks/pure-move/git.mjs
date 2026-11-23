// The git side of pure-move-check: the diff's entries and the head tree the facade rules read.
import { CODE_SPECS, grepFiles } from './identifiers.mjs';

/** Parses `git diff --name-status -M` output. */
export function parseNameStatus(out) {
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [status = '', a = '', b] = line.split('\t');
      return { status, from: a, to: b ?? a };
    });
}

/** `{ read(file) → text or '', grep(ere) → files }` of the head tree; `git(...args)` → stdout. */
export function headTree(git, head) {
  const memo = new Map();
  let files;
  const exists = (file) => (files ??= new Set(git('ls-tree', '-r', '--name-only', head).split('\n'))).has(file);
  const load = (file) => (exists(file) ? git('show', `${head}:${file}`) : '');
  const read = (file) => memo.get(file) ?? memo.set(file, load(file)).get(file);
  const grep = (re) =>
    grepFiles(() => git('grep', '-lE', re, head, '--', ...CODE_SPECS)).map((f) => f.slice(f.indexOf(':') + 1));
  return { read, grep };
}
