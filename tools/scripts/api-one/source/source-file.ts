import ts from 'typescript';
import { identifiersNamed, lineOf, narrow } from '../ast.ts';
import { applyEdits } from '../../units/components/model/edits.ts';
import { parseFile } from '../../units/components/model/source.ts';
import { planCalls } from './calls.ts';
import { importEdits, leftReferences } from './imports.ts';
import { importedPair, isPairName } from './pair.ts';
import type { CallEdit, FileResult, Found } from './source.types.ts';

const DECLARED_NAME: ((p: ts.Node) => ts.Node | undefined)[] = [
  (p) => narrow(p, ts.isVariableDeclaration)?.name,
  (p) => narrow(p, ts.isParameter)?.name,
  (p) => narrow(p, ts.isFunctionDeclaration)?.name,
  (p) => narrow(p, ts.isBindingElement)?.name,
];

const importsPair = (named: ts.NamedImports): boolean =>
  named.elements.some((e) => isPairName(e.name.text));

/** `call` imported beside the pair is the kit's own; from anywhere else it is a clash. */
function importedElsewhere(id: ts.Identifier): boolean {
  const spec = narrow(id.parent, ts.isImportSpecifier);
  return spec !== undefined && !importsPair(spec.parent);
}

/** A binding named like the target that is not the kit import itself blocks the rewrite. */
function blockerOf(sf: ts.SourceFile): (target: string) => string | undefined {
  const declares = (id: ts.Identifier): boolean =>
    DECLARED_NAME.some((nameOf) => nameOf(id.parent) === id) || importedElsewhere(id);
  return (target) =>
    identifiersNamed(sf, target).some(declares) ? `a local binding named ${target}` : undefined;
}

const isCallee = (id: ts.Identifier): boolean =>
  narrow(id.parent, ts.isCallExpression)?.expression === id;

const references = (sf: ts.SourceFile, edits: readonly CallEdit[]): Found[] =>
  [...importedPair(sf).keys()].flatMap((name) =>
    leftReferences(sf, name, edits)
      .filter((id) => !isCallee(id))
      .map((id): Found => ({ line: lineOf(id), result: 'left', reason: `${name}: a reference` })),
  );

/** One source file with its pair calls rewritten to call()/publicCall()/request(). */
export function rewriteSource(path: string, text: string): FileResult {
  const sf = parseFile(path, text);
  const planned = planCalls(sf, blockerOf(sf));
  const edits = planned.flatMap((p) => (p.edit === undefined ? [] : [p.edit]));
  const all = [...edits.map((e) => e.edit), ...importEdits(sf, edits)];
  const found = [...planned.map((p) => p.found), ...references(sf, edits)];
  return { text: all.length === 0 ? text : applyEdits(text, all), found };
}
