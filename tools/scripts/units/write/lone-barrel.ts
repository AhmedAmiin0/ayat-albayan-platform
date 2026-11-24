import { posix } from 'node:path';
import { Node } from 'ts-morph';
import type { FolderPlan, UnitPlan } from '../plan/plan.types.ts';
import type { BarrelUse } from './write.types.ts';
import { newProject } from '../../ci-checks/move-module/rewrite.ts';
import { isCode, isTest, stemOf } from '../scan/files.ts';

const DEFAULT = 'default';

const isTypeDecl = (d: Node): boolean =>
  Node.isInterfaceDeclaration(d) || Node.isTypeAliasDeclaration(d);

/** The file's named exports (no default) → type-only. */
function exportsOf(file: string, text: string): Map<string, boolean> {
  const sf = newProject().createSourceFile(`/virtual/${file}`, text);
  const decls = [...sf.getExportedDeclarations()].filter(([name]) => name !== DEFAULT);
  return new Map(decls.map(([name, ds]) => [name, ds.length > 0 && ds.every(isTypeDecl)]));
}

const isMain = (u: UnitPlan, to: string): boolean => {
  const name = posix.basename(to);
  return isCode(name) && !isTest(name) && stemOf(name) === u.unit.name;
};

/** The unit's own file once moved: `<name>.ts(x)` in its new folder. */
const mainOf = (u: UnitPlan): string | undefined => u.moves.find((m) => isMain(u, m.to))?.to;

/**
 * What the index.ts of a folded unit that no importer names re-exports: its own file's named
 * exports, so every folded unit has an export-only index.ts (CLAUDE.md rule 13).
 */
export function loneBarrels(
  plans: readonly FolderPlan[],
  used: ReadonlyMap<string, BarrelUse>,
  read: (file: string) => string,
): Map<string, BarrelUse> {
  const units = plans.flatMap((p) => p.units).filter((u) => u.unit.action === 'fold');
  return new Map(
    units.flatMap((u): [string, BarrelUse][] => {
      const main = mainOf(u);
      if (used.has(u.home) || main === undefined) return [];
      const names = exportsOf(main, read(main));
      return names.size === 0 ? [] : [[u.home, { style: 'bare', files: new Map([[main, names]]) }]];
    }),
  );
}
