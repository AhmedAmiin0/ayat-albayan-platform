// A tree of the frontend workspaces' files: the head from the working copy, the base from git.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { WORKSPACES } from './scope.mjs';

const WANTED = /\.(?:tsx?|mts)$|(?:^|\/)package\.json$/;

/** `files`: path → text. */
export function treeOf(files) {
  const dirs = Map.groupBy([...files.keys()], (path) => dirname(path));
  return {
    paths: [...files.keys()],
    read: (path) => files.get(path) ?? '',
    has: (path) => files.has(path),
    list: (dir) => (dirs.get(dir) ?? []).map((path) => basename(path)),
  };
}

const run = (cwd, args, input) =>
  execFileSync('git', args, { cwd, input, maxBuffer: 1024 * 1024 * 1024 });

export function headTree(cwd) {
  const listed = run(cwd, ['ls-files', '-co', '--exclude-standard', '-z', '--', ...WORKSPACES]);
  const paths = listed
    .toString('utf8')
    .split('\0')
    .filter((p) => WANTED.test(p));
  return treeOf(new Map(paths.map((p) => [p, readFileSync(join(cwd, p), 'utf8')])));
}

/** Splits `git cat-file --batch` output into the blobs' texts, in order. */
function blobs(out) {
  const texts = [];
  for (let at = 0; at < out.length;) {
    const eol = out.indexOf(10, at);
    const size = Number(out.subarray(at, eol).toString('utf8').split(' ')[2]);
    texts.push(out.subarray(eol + 1, eol + 1 + size).toString('utf8'));
    at = eol + 2 + size;
  }
  return texts;
}

export function gitTree(cwd, rev) {
  const listed = run(cwd, ['ls-tree', '-r', '-z', rev, '--', ...WORKSPACES]).toString('utf8');
  const rows = listed
    .split('\0')
    .filter(Boolean)
    .map((row) => row.split('\t'))
    .filter(([meta, path]) => meta.includes(' blob ') && WANTED.test(path));
  const shas = rows.map(([meta]) => meta.split(' ')[2]);
  const texts = shas.length === 0 ? [] : blobs(run(cwd, ['cat-file', '--batch'], shas.join('\n')));
  return treeOf(new Map(rows.map(([, path], i) => [path, texts[i] ?? ''])));
}
