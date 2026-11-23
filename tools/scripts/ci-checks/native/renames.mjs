// The Expo apps moved folders: apps/mobile → apps/staff-mobile, apps/family →
// apps/family-mobile. The last APK may predate the move, so native-changes.mjs reads that build's
// files at their old paths, names them by the new ones and compares by content: a file that only
// moved is no change.
import { execFileSync } from 'node:child_process';

/** Current app folder → its folder before the move. */
export const LEGACY_DIRS = {
  'apps/staff-mobile': 'apps/mobile',
  'apps/family-mobile': 'apps/family',
};
const PAIRS = Object.entries(LEGACY_DIRS);
const under = (path, dir) => path === dir || path.startsWith(`${dir}/`);

/** A path read at an older commit, under today's folder names. */
export function currentPath(path) {
  const hit = PAIRS.find(([, old]) => under(path, old));
  return hit ? hit[0] + path.slice(hit[1].length) : path;
}

/** The pathspecs plus their pre-move twins, so a commit from before the move is read too. */
export function withLegacy(paths) {
  const twin = (p) =>
    PAIRS.filter(([now]) => under(p, now)).map(([now, old]) => old + p.slice(now.length));
  const twins = paths.flatMap(twin);
  return [...new Set([...paths, ...twins])];
}

/** The app folder, then its pre-move name (where an older commit keeps its files). */
export const dirsOf = (dir) => [dir, LEGACY_DIRS[dir]].filter(Boolean);

/** Relative paths between the apps (apps/family's app.json used ../mobile/assets), renamed. */
const sibling = (dir) => `../${dir.slice('apps/'.length)}/`;
export const currentRefs = (text) =>
  PAIRS.reduce((t, [now, old]) => t.replaceAll(sibling(old), sibling(now)), text);

/** `git ls-tree -r -z` output → Map(current path → "mode type blob"): a mode change counts. */
export function blobs(lsTree) {
  const entries = lsTree.split('\0').filter(Boolean).map((line) => line.split('\t'));
  return new Map(entries.map(([meta, path]) => [currentPath(path), meta]));
}

/** Paths added, removed or edited between two trees (Map path → entry); a pure move is none. */
export function changedPaths(before, after) {
  const all = [...new Set([...before.keys(), ...after.keys()])];
  return all.filter((p) => before.get(p) !== after.get(p)).sort();
}

const QUIET = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] };
const git = (args) => execFileSync('git', args, QUIET);
const gitShow = (spec) => {
  try {
    return git(['show', spec]);
  } catch {
    return null;
  }
};

/** `dir/file` at `ref` (or at its pre-move path), with today's folder names; '' when absent. */
export function readAt(ref, dir, file) {
  const text = dirsOf(dir).map((d) => gitShow(`${ref}:${d}/${file}`)).find((t) => t !== null);
  return currentRefs(text ?? '');
}

const tree = (ref, paths) => blobs(git(['ls-tree', '-r', '-z', ref, '--', ...withLegacy(paths)]));

/** Files under `paths` whose content differs between `ref` and HEAD (a move is no change). */
export function changedFiles(ref, paths) {
  try {
    return changedPaths(tree(ref, paths), tree('HEAD', paths));
  } catch {
    return [`${paths.join(', ')} (git diff failed)`];
  }
}
