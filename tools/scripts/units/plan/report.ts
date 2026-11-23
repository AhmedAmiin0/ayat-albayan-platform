import { posix } from 'node:path';
import type { FolderPlan, SkipKind, UnitPlan } from './plan.types.ts';
import { workspaceOf } from '../scan/tree.ts';

interface Row {
  units: number;
  files: number;
  folders: number;
  skipped: Partial<Record<SkipKind, number>>;
}

const empty = (): Row => ({ units: 0, files: 0, folders: 0, skipped: {} });

const filesOf = (p: FolderPlan): number => p.units.reduce((n, u) => n + u.unit.files.length, 0);

function addPlan(row: Row, p: FolderPlan): Row {
  if (p.skip === undefined) {
    return {
      ...row,
      units: row.units + p.units.length,
      files: row.files + filesOf(p),
      folders: row.folders + 1,
    };
  }
  const kind = p.skip.kind;
  return { ...row, skipped: { ...row.skipped, [kind]: (row.skipped[kind] ?? 0) + 1 } };
}

const skippedText = (s: Row['skipped']): string => {
  const kinds = Object.entries(s);
  const total = kinds.reduce((n, [, c]) => n + c, 0);
  return total === 0 ? '0' : `${total} (${kinds.map(([k, c]) => `${k} ${c}`).join(', ')})`;
};

const line = (name: string, r: Row): string =>
  `${name} | ${r.units} | ${r.files} | ${r.folders} | ${skippedText(r.skipped)}`;

/** A markdown-ready table: per workspace, what folds and which folders are skipped. */
export function summaryLines(plans: readonly FolderPlan[]): string[] {
  const rows = new Map<string, Row>();
  plans.forEach((p) =>
    rows.set(workspaceOf(p.dir), addPlan(rows.get(workspaceOf(p.dir)) ?? empty(), p)),
  );
  const total = plans.reduce(addPlan, empty());
  const skipped = Object.values(total.skipped).reduce((n, c) => n + c, 0);
  return [
    'workspace | units | files | folders | skipped folders',
    ...[...rows].sort(([a], [b]) => a.localeCompare(b)).map(([w, r]) => line(w, r)),
    `total | ${total.units} | ${total.files} | ${total.folders} | ${skipped}`,
  ];
}

const unitText = (u: UnitPlan): string =>
  `${posix.relative(u.unit.dir, u.home) || '.'}/ ${u.unit.action} ${u.unit.files.length}`;

export const folderLines = (plans: readonly FolderPlan[]): string[] =>
  plans.map((p) =>
    p.skip === undefined
      ? `${p.dir}: ${p.units.map(unitText).join(', ')}`
      : `${p.dir}: skipped (${p.skip.kind}: ${p.skip.why})`,
  );

/** The planned tree: each move of each folder, relative to the folder. */
export const treeLines = (plans: readonly FolderPlan[]): string[] =>
  plans.flatMap((p) => [
    `${p.dir}/`,
    ...p.units.flatMap((u) =>
      u.moves.map((m) => `  ${posix.relative(p.dir, m.from)} -> ${posix.relative(p.dir, m.to)}`),
    ),
  ]);
