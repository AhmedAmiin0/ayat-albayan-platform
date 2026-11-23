import type { FloatingUnit } from '../scan/scan.types.ts';

/** One `git mv`, repo-relative. */
export interface Move {
  from: string;
  to: string;
}

/** A unit's planned moves; `home` is its folder once moved. */
export interface UnitPlan {
  unit: FloatingUnit;
  home: string;
  moves: Move[];
}

export type SkipKind = 'excluded' | 'open PR' | 'exists' | 'cap' | 'named by path';

export interface Skip {
  kind: SkipKind;
  why: string;
}

/** A folder's floating units and their moves, or why the folder is left as it is. */
export interface FolderPlan {
  dir: string;
  units: UnitPlan[];
  skip?: Skip;
}

export interface PlanInput {
  paths: readonly string[];
  /** File → files that name it by path (plan/refs.ts). */
  refs: ReadonlyMap<string, string[]>;
  /** Folder → open PRs that touch it; empty when open PRs are not skipped. */
  prDirs: ReadonlyMap<string, number[]>;
  /** Folder prefixes to plan; all folders when absent. */
  only?: readonly string[];
}
