import type { FloatingUnit } from './scan.types.ts';
import { floatingIn } from './floating.ts';
import { exclusionOf, foldersOf } from './tree.ts';

/** Every floating unit of the tracked paths, excluded trees included (the caller decides). */
export const floatingUnits = (paths: readonly string[]): FloatingUnit[] =>
  [...foldersOf(paths)].flatMap(([dir, names]) => floatingIn(dir, names));

/** Floating units the guard counts: those outside the excluded trees. */
export const guardedUnits = (paths: readonly string[]): FloatingUnit[] =>
  floatingUnits(paths).filter((u) => exclusionOf(u.dir) === undefined);
