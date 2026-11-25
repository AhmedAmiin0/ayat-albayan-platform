import { posix } from 'node:path';
import ts from 'typescript';
import type { FloatingUnit } from './scan.types.ts';
import { isTest, stemOf } from './files.ts';

// `units:fold -- --components` (docs/63 §4 phase 1): every component file folds into its own
// folder, whatever its size. Icon sets stay one file (docs/63 Q3); showcases and test helpers
// follow their component.
const FRONTEND = /^(?:apps\/(?:staff|family)-(?:web|mobile)|packages\/(?:web|mobile)-kit)\/src\//;
const PLAIN_TSX = /^[^.]+\.tsx$/;
const PASCAL = /^[A-Z](?=[A-Za-z0-9]*[a-z])[A-Za-z0-9]*$/;

export const pascalOf = (stem: string): string =>
  stem
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');

const hasJsx = (node: ts.Node): boolean =>
  ts.isJsxElement(node) ||
  ts.isJsxSelfClosingElement(node) ||
  ts.isJsxFragment(node) ||
  ts.forEachChild(node, (child) => hasJsx(child) || undefined) === true;

const isFunctionish = (node: ts.Node | undefined): boolean =>
  node !== undefined &&
  (ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node) ||
    (ts.isCallExpression(node) && node.arguments.some(isFunctionish)));

const isComponent = (s: ts.Statement): boolean => {
  if (ts.isFunctionDeclaration(s)) return PASCAL.test(s.name?.text ?? '') && hasJsx(s);
  if (!ts.isVariableStatement(s)) return false;
  return s.declarationList.declarations.some(
    (d) => PASCAL.test(d.name.getText()) && isFunctionish(d.initializer) && hasJsx(d),
  );
};

/** A top-level PascalCase function, or const holding one, whose body has JSX. */
export function holdsComponent(text: string, path: string): boolean {
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  return sf.statements.some(isComponent);
}

const isCandidate = (name: string): boolean =>
  PLAIN_TSX.test(name) && !isTest(name) && !name.endsWith('-icons.tsx');

function unitOf(dir: string, names: readonly string[], stem: string): FloatingUnit[] {
  const name = pascalOf(stem);
  if (posix.basename(dir) === name) return [];
  const files = names.filter((n) => n === `${stem}.tsx` || n.startsWith(`${stem}.`)).toSorted();
  const rename = name === stem ? {} : { rename: name };
  return [{ dir, name: stem, files, tests: files.filter(isTest), action: 'fold', ...rename }];
}

/** The component units of one folder; `holds` tells whether a repo path holds a component. */
export function componentUnitsIn(
  dir: string,
  names: readonly string[],
  holds: (path: string) => boolean,
): FloatingUnit[] {
  if (!FRONTEND.test(`${dir}/`)) return [];
  return names
    .filter(isCandidate)
    .map(stemOf)
    .filter((stem) => holds(posix.join(dir, `${stem}.tsx`)))
    .toSorted()
    .flatMap((stem) => unitOf(dir, names, stem));
}
