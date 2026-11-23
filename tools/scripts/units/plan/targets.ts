import { posix } from 'node:path';
import type { FloatingUnit, UnitAction } from '../scan/scan.types.ts';
import type { Move, UnitPlan } from './plan.types.ts';
import { isTest } from '../scan/files.ts';

const TESTS_DIR = 'tests';
const SNAPSHOTS = '__snapshots__';
const TESTS_MIN = 2;
const OWN_TEST = /^(?:test|spec)\.[cm]?[jt]sx?$/;

const HOMES: Record<UnitAction, (u: FloatingUnit) => string> = {
  fold: (u) => posix.join(u.dir, u.name),
  tests: (u) => u.dir,
};

/** `ThreadPane.chat.test.tsx` → `chat.test.tsx`; `ThreadPane.test.tsx` keeps its name. */
export function testName(unit: string, name: string): string {
  const rest = name.slice(unit.length + 1);
  return name.startsWith(`${unit}.`) && !OWN_TEST.test(rest) ? rest : name;
}

/** The test's move and, when vitest keeps one, its snapshot file's. */
function testMoves(from: string, to: string, tracked: ReadonlySet<string>): Move[] {
  const snap = (path: string): string =>
    posix.join(posix.dirname(path), SNAPSHOTS, `${posix.basename(path)}.snap`);
  const moves = [{ from, to }];
  return tracked.has(snap(from)) ? [...moves, { from: snap(from), to: snap(to) }] : moves;
}

/** Where each file of the unit goes; files already in place are left out. */
export function planUnit(unit: FloatingUnit, tracked: ReadonlySet<string>): UnitPlan {
  const home = HOMES[unit.action](unit);
  const testsHome = unit.tests.length >= TESTS_MIN ? posix.join(home, TESTS_DIR) : home;
  const moves = unit.files.flatMap((name) => {
    const from = posix.join(unit.dir, name);
    if (!isTest(name)) return home === unit.dir ? [] : [{ from, to: posix.join(home, name) }];
    return testMoves(from, posix.join(testsHome, testName(unit.name, name)), tracked);
  });
  return { unit, home, moves: moves.filter((m) => m.from !== m.to) };
}
