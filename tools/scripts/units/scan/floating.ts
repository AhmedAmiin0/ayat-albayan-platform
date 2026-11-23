import { posix } from 'node:path';
import type { FloatingUnit, UnitAction } from './scan.types.ts';
import { isTest } from './files.ts';
import { unitsOf } from './unit-of.ts';

interface Candidate {
  home: boolean;
  files: string[];
  tests: string[];
}

const FOLD_MIN = 3;
const TESTS_MIN = 2;

/** Each action with the predicate that calls for it; a unit takes the first that holds. */
const ACTIONS: [UnitAction, (c: Candidate) => boolean][] = [
  ['fold', (c) => !c.home && c.files.length >= FOLD_MIN],
  ['tests', (c) => c.home && c.tests.length >= TESTS_MIN],
];

const actionOf = (c: Candidate): UnitAction | undefined =>
  ACTIONS.find(([, holds]) => holds(c))?.[0];

/** The floating units among one folder's file names. */
export function floatingIn(dir: string, names: readonly string[]): FloatingUnit[] {
  return [...unitsOf(names)].flatMap(([name, files]) => {
    const c = { home: posix.basename(dir) === name, files, tests: files.filter(isTest) };
    const action = actionOf(c);
    return action === undefined ? [] : [{ dir, name, files, tests: c.tests, action }];
  });
}
