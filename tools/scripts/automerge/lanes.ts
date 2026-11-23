/** Branch prefix → the low-risk lane it belongs to. The only list of auto-merged branches. */
export const LANES: Readonly<Record<string, string>> = {
  'cut/': 'package dependency cuts',
  'chore/comments-': 'comment-only PRs (pnpm guard:comments)',
  'move/': 'pure-move facade and shim sweeps',
};

/** Removing it from a PR stops its merge. */
export const LABEL = 'auto-merge';

export const laneOf = (branch: string): string | null =>
  Object.keys(LANES).find((prefix) => branch.startsWith(prefix)) ?? null;
