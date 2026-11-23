// What the codemod does with one file. Over-cap files are left for a split lane so a codemod PR
// never breaks max-lines (CLAUDE.md rule 1); namespace imports and mocks need a person.
import type { Project, SourceFile } from 'ts-morph';
import { specifierNodes } from '../../ci-checks/move-module/specifiers.ts';
import { rewriteFacade } from './rewrite.ts';
import { FACADE, namedOf } from './statement.ts';
import type { Kept, FilePlan, PlanInput } from './types.ts';

const MAX_LINES = 150;
const MAX_LEN = 100;

const lineCount = (text: string): number => text.split('\n').length - Number(text.endsWith('\n'));

/** True when `after` passes 150 lines or adds a line over 100 characters. */
export function overCap(before: string, after: string): boolean {
  const old = new Set(before.split('\n'));
  const longer = after.split('\n').some((l) => l.length > MAX_LEN && !old.has(l));
  return longer || lineCount(after) > MAX_LINES;
}

function isManual(sf: SourceFile): boolean {
  const all = specifierNodes(sf).filter((s) => s.value === FACADE).length;
  const named = [...sf.getImportDeclarations(), ...sf.getExportDeclarations()]
    .map(namedOf)
    .filter((n) => n?.spec === FACADE).length;
  return all > named;
}

function judge(sf: SourceFile, input: PlanInput): FilePlan {
  const out = rewriteFacade(sf, input.owners);
  const checks: [Kept, () => boolean][] = [
    ['manual', () => isManual(sf)],
    ['same', () => out.text === input.text],
    ['overCap', () => overCap(input.text, out.text)],
  ];
  const kind = checks.find(([, applies]) => applies())?.[0];
  return kind === undefined ? { kind: 'change', ...out } : { kind };
}

/** The plan for one file, parsed in `project` (which keeps no trace of it after). */
export function planFile(project: Project, input: PlanInput): FilePlan {
  const sf = project.createSourceFile(`/${input.path}`, input.text, { overwrite: true });
  const plan = judge(sf, input);
  project.removeSourceFile(sf);
  return plan;
}
