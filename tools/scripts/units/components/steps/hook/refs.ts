import ts from 'typescript';
import { bindingNames, isKey } from '../../model/names.ts';
import { calleeName, findAll } from '../../model/source.ts';
import type { TextEdit } from '../../model/model.types.ts';

const isRefDecl = (d: ts.VariableDeclaration): boolean =>
  d.initializer !== undefined &&
  ts.isCallExpression(d.initializer) &&
  calleeName(d.initializer) === 'useRef';

/** `useRef` names of the setup that do not end in `Ref` → their new names. */
export function refRenames(setup: readonly ts.Statement[]): Map<string, string> {
  const decls = setup
    .filter(ts.isVariableStatement)
    .flatMap((s) => [...s.declarationList.declarations]);
  const names = decls.filter(isRefDecl).flatMap((d) => bindingNames(d.name));
  return new Map(names.filter((n) => !n.endsWith('Ref')).map((n) => [n, `${n}Ref`]));
}

/** True when the view reads `.current` of a ref, which a render must not do (docs/63 §2). */
export const readsCurrent = (view: readonly ts.Node[], refs: ReadonlySet<string>): boolean =>
  view.some(
    (node) =>
      findAll(
        node,
        (n) =>
          ts.isPropertyAccessExpression(n) &&
          n.name.text === 'current' &&
          ts.isIdentifier(n.expression) &&
          refs.has(n.expression.text),
      ).length > 0,
  );

/** Edits renaming every use of the refs in `node`; a shorthand `{ x }` keeps its key. */
export function renameEdits(
  node: ts.Node,
  { renames, sf }: { renames: ReadonlyMap<string, string>; sf: ts.SourceFile },
): TextEdit[] {
  const ids = findAll(node, (n) => ts.isIdentifier(n) && renames.has(n.text)).filter(
    ts.isIdentifier,
  );
  return ids
    .filter((id) => !isKey(id))
    .map((id) => {
      const next = renames.get(id.text) ?? id.text;
      const value = ts.isShorthandPropertyAssignment(id.parent) ? `${id.text}: ${next}` : next;
      return { start: id.getStart(sf), end: id.getEnd(), value };
    });
}
