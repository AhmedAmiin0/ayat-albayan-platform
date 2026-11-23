// Baseline entries are keyed by paths; a move carries an entry to its file's new path (docs/27 §4),
// so the shrink checks compare the base's entries at their head paths.
import { execFileSync } from 'node:child_process';
import { folderRenames } from '../../pure-move-tokens.mjs';

const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8' });

/** The `[from, to]` file renames from the base checkout's commit to the head's. */
export function gitRenames(root, baseDir) {
  const base = git(baseDir, ['rev-parse', 'HEAD']).trim();
  const diff = git(root, ['diff', '--name-status', '-M50%', '--diff-filter=R', base, 'HEAD']);
  return diff
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('\t').slice(1));
}

/** Where a base file or folder is in the head: its rename, its moved folder, or itself. */
export function mover(renames, gone) {
  const files = new Map(renames);
  const dirs = folderRenames(renames, gone).sort(([a], [b]) => b.length - a.length);
  const inDir = (path) => dirs.find(([dir]) => path === dir || path.startsWith(`${dir}/`));
  const viaDir = (path) => {
    const [dir, to] = inDir(path) ?? [path, path];
    return `${to}${path.slice(dir.length)}`;
  };
  return (path) => files.get(path) ?? viaDir(path);
}
