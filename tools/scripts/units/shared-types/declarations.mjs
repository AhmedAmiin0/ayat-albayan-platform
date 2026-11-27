// One file's exported types, interfaces, literal unions, z.enum schemas and `as const` objects.
import ts from 'typescript';
import { exportsOf, importsOf, localsOf } from './exports.mjs';
import { workspaceOf } from './files.mjs';
import { constObjectShape, constValue, literalShape, typeShape, unionLiterals } from './shape.mjs';

const WIRE_FILE = /\.(?:schemas|dto|events?|api|contracts?)\.ts$/;
const WIRE_TYPE = /\bz\.(?:infer|input|output)</;

const typeAlias = (node, sf) => {
  const literals = unionLiterals(node.type);
  const object = ts.isTypeLiteralNode(node.type);
  const kind = literals ? 'literal-union' : 'type';
  const shape = literals ? literalShape(literals) : null;
  const params = { members: node.type.members, typeParameters: node.typeParameters };
  return {
    kind,
    shape: object ? typeShape(params, sf) : shape,
    wire: WIRE_TYPE.test(node.getText(sf)),
  };
};

const isEnumCall = (expr) =>
  ts.isCallExpression(expr) &&
  ts.isPropertyAccessExpression(expr.expression) &&
  expr.expression.name.text === 'enum';

const tupleOf = (arg, locals) => {
  const local = ts.isIdentifier(arg) ? locals.get(arg.text) : undefined;
  const value = local && ts.isVariableDeclaration(local) && local.initializer;
  const tuple = value ? constValue(value) : arg;
  return tuple && ts.isArrayLiteralExpression(tuple) ? [...tuple.elements] : [];
};

const zEnum = (expr, { locals }) => ({
  kind: 'z-enum',
  shape: literalShape(tupleOf(expr.arguments[0] ?? expr, locals)),
  wire: false,
});

const constObject = (expr, { sf }) => {
  const value = constValue(expr);
  const object = value && ts.isObjectLiteralExpression(value);
  return object ? { kind: 'const-object', shape: constObjectShape(value, sf), wire: false } : null;
};

/** What an exported expression is: a z.enum, an `as const` object, or nothing listed. */
const expression = (expr, ctx) => (isEnumCall(expr) ? zEnum(expr, ctx) : constObject(expr, ctx));

const DESCRIBE = {
  [ts.SyntaxKind.InterfaceDeclaration]: (node, { sf }) => ({
    kind: 'interface',
    shape: typeShape(node, sf),
    wire: false,
  }),
  [ts.SyntaxKind.TypeAliasDeclaration]: (node, { sf }) => typeAlias(node, sf),
  [ts.SyntaxKind.VariableDeclaration]: (node, ctx) =>
    node.initializer ? expression(node.initializer, ctx) : null,
};

const scriptKind = (path) => (path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

const lineOf = (sf, node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

function described({ name, node, ctx }) {
  const found =
    DESCRIBE[node.kind]?.(node, ctx) ?? (ts.isExpression(node) ? expression(node, ctx) : null);
  return found && { name, line: lineOf(ctx.sf, node), node, ...found };
}

/** `{ path, ws, declarations, imports, error? }`; a file that does not parse lists nothing. */
export function scanFile(path, text) {
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, scriptKind(path));
  const ws = workspaceOf(path);
  const [problem] = sf.parseDiagnostics;
  if (problem) return { path, ws, declarations: [], imports: [], error: flatten(problem) };
  const locals = localsOf(sf);
  const ctx = { sf, locals };
  const { named, defaults } = exportsOf(sf);
  const rows = [
    ...named.flatMap(({ name, local }) => {
      const node = locals.get(local);
      return node ? [{ name, node, ctx }] : [];
    }),
    ...defaults.map((node) => ({ name: 'default', node, ctx })),
  ];
  const declarations = rows
    .map(described)
    .filter(Boolean)
    .toSorted((a, b) => a.node.pos - b.node.pos)
    .map(({ node: _node, ...row }) => ({
      ...row,
      path,
      ws,
      wire: row.wire || WIRE_FILE.test(path),
    }));
  return { path, ws, declarations, imports: importsOf(sf, path) };
}

const flatten = (problem) => ts.flattenDiagnosticMessageText(problem.messageText, '\n');
