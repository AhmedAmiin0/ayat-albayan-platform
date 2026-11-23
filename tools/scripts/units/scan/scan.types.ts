/** `fold`: the unit moves into its own folder; `tests`: its tests move to tests/ in its folder. */
export type UnitAction = 'fold' | 'tests';

/** A unit that is not in place yet: `dir` is its folder today, `files` its file names there. */
export interface FloatingUnit {
  dir: string;
  name: string;
  files: string[];
  tests: string[];
  action: UnitAction;
}

/** Why a folder is scanned but never folded (route trees, Nest modules, generated code). */
export interface Exclusion {
  test: RegExp;
  why: string;
}
