import ts from 'typescript';
import type { AdoptInput } from './adopt.types.ts';
import { applyEdits, type TextEdit as Edit } from '../../model/edits.ts';
import { groupBy } from '../../model/group.ts';
import { all, no, ok, type Result } from '../../model/result.ts';
import { findAll, parseFile } from '../../model/source.ts';

const MOCK = /^(?:vi|jest)\.(?:mock|doMock|unmock|doUnmock|importActual|requireActual)$/;

export interface Retarget {
  old: string;
  /** Exported name → its new file. */
  targets: ReadonlyMap<string, string>;
  ownFile: string;
  repo: Pick<AdoptInput, 'resolve' | 'specFor'>;
}

const specOf = (d: ts.ImportDeclaration): string =>
  ts.isStringLiteral(d.moduleSpecifier) ? d.moduleSpecifier.text : '';

const namedOnly = (d: ts.ImportDeclaration): ts.NamedImports | undefined => {
  const b = d.importClause?.namedBindings;
  const plain = d.importClause?.name === undefined && b !== undefined && ts.isNamedImports(b);
  return plain ? b : undefined;
};

const isTypeOnly = (d: ts.ImportDeclaration): boolean =>
  d.importClause?.phaseModifier === ts.SyntaxKind.TypeKeyword;

interface Placed {
  file: string;
  text: string;
}

function importEdit(path: string, d: ts.ImportDeclaration, rt: Retarget): Result<Edit> {
  const b = namedOnly(d);
  if (b === undefined) return no(`${path} imports the hook module whole`);
  const placed = all([...b.elements], (e): Result<Placed> => {
    const file = rt.targets.get((e.propertyName ?? e.name).text);
    if (file === undefined) return no(`${path} imports ${e.name.text}, which the hook file lacks`);
    return ok({ file, text: e.getText() });
  });
  if (!placed.ok) return no(placed.why);
  const lead = isTypeOnly(d) ? 'import type' : 'import';
  const value = [...groupBy(placed.value, (p) => p.file)]
    .map(([file, list]) => {
      const names = list.map((p) => p.text).join(', ');
      return `${lead} { ${names} } from '${rt.repo.specFor(path, file)}';`;
    })
    .join('\n');
  return ok({ start: d.getStart(), end: d.getEnd(), value });
}

function mockEdits(path: string, sf: ts.SourceFile, rt: Retarget): Result<Edit[]> {
  const hits = findAll(sf, (n) => ts.isCallExpression(n) && MOCK.test(n.expression.getText()))
    .filter(ts.isCallExpression)
    .flatMap((c) => c.arguments.slice(0, 1).filter(ts.isStringLiteral))
    .filter((s) => rt.repo.resolve(path, s.text) === rt.old);
  if (hits.length > 0 && rt.targets.size > 1) return no(`${path} mocks the hook module`);
  const value = rt.repo.specFor(path, rt.ownFile);
  return ok(hits.map((s) => ({ start: s.getStart() + 1, end: s.getEnd() - 1, value })));
}

/** `path`'s imports and mocks of the old hook file, pointed at the files its names moved to. */
export function retarget(path: string, text: string, rt: Retarget): Result<string> {
  const sf = parseFile(path, text);
  const decls = sf.statements
    .filter(ts.isImportDeclaration)
    .filter((d) => rt.repo.resolve(path, specOf(d)) === rt.old);
  const edits = all(decls, (d) => importEdit(path, d, rt));
  if (!edits.ok) return no(edits.why);
  const mocks = mockEdits(path, sf, rt);
  return mocks.ok ? ok(applyEdits(text, [...edits.value, ...mocks.value])) : no(mocks.why);
}
