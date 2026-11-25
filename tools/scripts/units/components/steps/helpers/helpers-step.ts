import { posix } from 'node:path';
import ts from 'typescript';
import type { HelpersInput, HelpersVerdict } from './helpers.types.ts';
import { componentsOf, type Component } from '../../model/components.ts';
import { applyEdits } from '../../model/edits.ts';
import { groupBy } from '../../model/group.ts';
import { emitImports, importsOf } from '../../model/imports.ts';
import { declaredNames, readsAny } from '../../model/names.ts';
import { redirect } from '../../model/redirect.ts';
import { has, isJsx, parseFile } from '../../model/source.ts';
import { isTypeDecl } from '../types/declarations.ts';
import { movedDecls } from './closure.ts';
import { targetText } from './emit.ts';
import { targetOf } from './targets.ts';

const refuse = (why: string): HelpersVerdict => ({ result: 'refused', why });

interface Move {
  input: HelpersInput;
  sf: ts.SourceFile;
  moved: ts.Statement[];
  homes: Map<string, string>;
}

/** `Name.tsx` without the moved declarations, importing what it still reads from their files. */
function viewText(m: Move): string {
  const removed = applyEdits(
    m.input.text,
    m.moved.map((d) => ({ start: d.getFullStart(), end: d.getEnd(), value: '' })),
  );
  const sf = parseFile(m.input.path, removed);
  const reads = readsAny(sf.statements.filter((s) => !ts.isImportDeclaration(s)));
  const fromHomes = groupBy(
    [...m.homes].filter(([n]) => reads.has(n)),
    ([, home]) => home,
  );
  const lines = [
    ...emitImports(importsOf(sf), reads, { keepSideEffects: true }),
    ...[...fromHomes].map(
      ([home, rows]) => `import { ${rows.map(([n]) => n).join(', ')} } from './${home}';`,
    ),
  ];
  const imports = sf.statements.filter(ts.isImportDeclaration);
  const edits = imports.map((d, i) => ({
    start: i === 0 ? d.getStart(sf) : d.getFullStart(),
    end: d.getEnd(),
    value: i === 0 ? lines.join('\n') : '',
  }));
  const out = applyEdits(removed, edits);
  return imports.length === 0 ? `${lines.join('\n')}\n\n${out.replace(/^\n+/, '')}` : out;
}

function filesOf(m: Move): Record<string, string> {
  const dir = posix.dirname(m.input.path);
  const byHome = groupBy(m.moved, (d) => m.homes.get(declaredNames(d)[0] ?? '') ?? '');
  const targets = [...byHome].map(([stem, decls]): [string, string] => [
    `${dir}/${stem}.ts`,
    targetText({ sf: m.sf, decls, homes: m.homes, stem }),
  ]);
  const moved = new Map([...m.homes].map(([n, stem]) => [n, `${dir}/${stem}`]));
  const owner = `${dir}/${m.input.name}`;
  const followers = Object.entries(m.input.files)
    .map(([p, text]): [string, string, string] => [p, text, redirect(p, text, { owner, moved })])
    .filter(([, before, after]) => after !== before)
    .map(([p, , after]): [string, string] => [p, after]);
  return Object.fromEntries([[m.input.path, viewText(m)], ...targets, ...followers]);
}

const isMovable =
  (comps: readonly Component[]) =>
  (s: ts.Statement): boolean =>
    !ts.isImportDeclaration(s) &&
    !isTypeDecl(s) &&
    !comps.some((c) => c.statement === s) &&
    declaredNames(s).length > 0;

/** Step 3 (docs/63 §4): top-level code leaves `Name.tsx` for its helpers, style or hook files. */
export function helpersStep(input: HelpersInput): HelpersVerdict {
  const sf = parseFile(input.path, input.text);
  const comps = componentsOf(sf);
  const c = comps.find((x) => x.name === input.name);
  if (c === undefined) return refuse(`no component ${input.name}`);
  const decls = sf.statements.filter(isMovable(comps));
  const others = sf.statements.filter(
    (s) => !ts.isImportDeclaration(s) && !decls.includes(s) && s !== c.statement,
  );
  const moved = movedDecls({ c, decls, others });
  if (moved.length === 0) return { result: 'none' };
  if (moved.some((d) => has(d, isJsx))) return refuse('JSX in a top-level value');
  const compNames = new Set(comps.map((x) => x.name));
  if ([...readsAny(moved)].some((n) => compNames.has(n))) {
    return refuse('a top-level value reads a component (split step first)');
  }
  const names = new Set(moved.flatMap(declaredNames));
  const byPath = input.outside.find((o) => o.names.some((n) => names.has(n)));
  if (byPath !== undefined) return refuse(`a helper is imported by path from ${byPath.file}`);
  const homes = new Map(
    moved.flatMap((d) =>
      declaredNames(d).map((n): [string, string] => [n, targetOf(d, input.name)]),
    ),
  );
  return { result: 'helpers', files: filesOf({ input, sf, moved, homes }) };
}
