// docs/62 part 2 §4 guard B: a new `to*` mapper whose return type comes from a domain package
// returns `asResponse(…)`, never a hand-built copy of a row (a spread, or k: x.k copies).
import ts from 'typescript';

const PACKAGES = new Set(['@ab/shared', '@ab/money', '@ab/schedule', '@ab/settings', '@ab/catalog']);
const MAPPER_NAME = /^to[A-Z]/;
const COPIES = 3;
const CONTAINERS = new Set(['Promise', 'Array', 'ReadonlyArray']);
const WRAPPERS = new Set([
  ts.SyntaxKind.ParenthesizedExpression,
  ts.SyntaxKind.AsExpression,
  ts.SyntaxKind.SatisfiesExpression,
]);
const INNER_TYPE = {
  [ts.SyntaxKind.ArrayType]: (t) => t.elementType,
  [ts.SyntaxKind.TypeOperator]: (t) => t.type,
  [ts.SyntaxKind.TypeReference]: (t) =>
    CONTAINERS.has(t.typeName.getText()) ? t.typeArguments?.[0] : undefined,
};

const parse = (text, file) =>
  ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

const importedNames = (decl) => decl.importClause?.namedBindings?.elements ?? [];

/** Names the file imports from the domain packages. */
const packageNames = (sf) =>
  new Set(
    sf.statements
      .filter((s) => ts.isImportDeclaration(s) && PACKAGES.has(s.moduleSpecifier.text))
      .flatMap((s) => importedNames(s).map((e) => e.name.text)),
  );

/** The named type a return type declares, through Promise, arrays and `readonly`. */
function typeName(type) {
  const inner = type === undefined ? undefined : INNER_TYPE[type.kind]?.(type);
  if (inner !== undefined) return typeName(inner);
  return type !== undefined && ts.isTypeReferenceNode(type) ? type.typeName.getText() : null;
}

const isExported = (node) =>
  ts.canHaveModifiers(node) &&
  (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
const isFunctionValue = (init) =>
  init !== undefined && (ts.isArrowFunction(init) || ts.isFunctionExpression(init));

const fromVariable = (statement) =>
  statement.declarationList.declarations
    .filter((d) => ts.isIdentifier(d.name) && isFunctionValue(d.initializer))
    .map((d) => ({ name: d.name.text, fn: d.initializer, at: statement }));

const CANDIDATES = [
  [ts.isFunctionDeclaration, (s) => (s.name ? [{ name: s.name.text, fn: s, at: s }] : [])],
  [ts.isVariableStatement, fromVariable],
];

/** Exported functions, declared or bound to a const. */
const candidates = (sf) =>
  sf.statements
    .filter(isExported)
    .flatMap((s) => CANDIDATES.find(([is]) => is(s))?.[1](s) ?? []);

/** The expressions a function returns, outside nested functions. */
function returned(fn) {
  if (!ts.isBlock(fn.body)) return [fn.body];
  const out = [];
  const visit = (node) => {
    if (ts.isReturnStatement(node) && node.expression) out.push(node.expression);
    if (!ts.isFunctionLike(node)) ts.forEachChild(node, visit);
  };
  ts.forEachChild(fn.body, visit);
  return out;
}

const bare = (e) => (WRAPPERS.has(e.kind) ? bare(e.expression) : e);

const isCopy = (p) =>
  ts.isPropertyAssignment(p) &&
  ts.isPropertyAccessExpression(p.initializer) &&
  p.initializer.name.text === p.name.getText();

/** `k: x.k` properties of an object literal and of the literals inside it. */
const copies = (obj) =>
  obj.properties.reduce((n, p) => {
    const nested = ts.isPropertyAssignment(p) && ts.isObjectLiteralExpression(p.initializer);
    return n + (isCopy(p) ? 1 : 0) + (nested ? copies(p.initializer) : 0);
  }, 0);

const handBuilt = (e) =>
  ts.isObjectLiteralExpression(e) &&
  (e.properties.some(ts.isSpreadAssignment) || copies(e) >= COPIES);

/** One message per new mapper that hand-builds a package type: `file:line name …`. */
export function mapperFindings({ text, file, added }) {
  const sf = parse(text, file);
  const names = packageNames(sf);
  return candidates(sf).flatMap(({ name, fn, at }) => {
    const line = sf.getLineAndCharacterOfPosition(at.getStart(sf)).line + 1;
    const type = typeName(fn.type);
    const checked = MAPPER_NAME.test(name) && added.has(line) && names.has(type ?? '');
    const bad = checked && returned(fn).map(bare).some(handBuilt);
    return bad ? [`${file}:${line} ${name} returns a hand-built ${type}; wrap it in asResponse`] : [];
  });
}
