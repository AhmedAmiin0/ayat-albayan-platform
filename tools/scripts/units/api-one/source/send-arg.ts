import ts from 'typescript';
import { narrow, propKey, unwrap } from '../ast.ts';
import { findAll } from '../../components/model/source.ts';
import type { SendArg } from './source.types.ts';

const OPTION_KEYS = new Set(['body', 'schema']);
const OPTIONS_TYPE = /\bSendOptions\b|\bschema\b/;
const PLAIN = new Set([
  ts.SyntaxKind.TrueKeyword,
  ts.SyntaxKind.FalseKeyword,
  ts.SyntaxKind.NullKeyword,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
]);
const NOT_AN_OBJECT = new Set([
  ts.SyntaxKind.ArrayLiteralExpression,
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NumericLiteral,
  ts.SyntaxKind.TemplateExpression,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
]);

/** A `schema` given as plain data (`'json'`, 1, true) is part of a body, as sendParts reads it. */
const isPlainValue = (e: ts.Node): boolean => ts.isLiteralExpression(e) || PLAIN.has(e.kind);

const valueOf = (p: ts.ObjectLiteralElementLike): ts.Node | undefined =>
  narrow(p, ts.isPropertyAssignment)?.initializer ??
  narrow(p, ts.isShorthandPropertyAssignment)?.name;

const isOptionKey = (p: ts.ObjectLiteralElementLike): boolean => OPTION_KEYS.has(propKey(p));

/** sendParts at run time: exactly `{ body?, schema }` with a zod schema is options. */
function literalArg(o: ts.ObjectLiteralExpression): SendArg {
  const schema = o.properties.find((p) => propKey(p) === 'schema');
  const value = schema === undefined ? undefined : valueOf(schema);
  const options = o.properties.every(isOptionKey) && value !== undefined && !isPlainValue(value);
  return options ? 'options' : 'body';
}

const typeOf = (n: ts.Node): ts.TypeNode | undefined =>
  narrow(n, ts.isVariableDeclaration)?.type ?? narrow(n, ts.isParameter)?.type;

const byType = (type: ts.TypeNode | undefined): SendArg | undefined =>
  type && (OPTIONS_TYPE.test(type.getText()) ? 'undecided' : 'body');

function byInit(n: ts.Node): SendArg {
  const literal = narrow(
    narrow(n, ts.isVariableDeclaration)?.initializer,
    ts.isObjectLiteralExpression,
  );
  return literal === undefined ? 'undecided' : literalArg(literal);
}

const declaredArg = (n: ts.Node): SendArg => byType(typeOf(n)) ?? byInit(n);

const isDeclarationOf =
  (name: string) =>
  (n: ts.Node): boolean => {
    const named = narrow(n, ts.isVariableDeclaration)?.name ?? narrow(n, ts.isParameter)?.name;
    return narrow(named, ts.isIdentifier)?.text === name;
  };

/**
 * A variable is decided from its declarations in this file; they must all agree. One named
 * `body` that they leave undecided (a builder's result) is the body: nothing names options so.
 */
function variableArg(id: ts.Identifier): SendArg {
  const declared = findAll(id.getSourceFile(), isDeclarationOf(id.text)).map(declaredArg);
  const found = [...new Set(declared)];
  const decided = found.length === 1 ? (found[0] ?? 'undecided') : 'undecided';
  return decided === 'undecided' && id.text === 'body' ? 'body' : decided;
}

const isBodyAccess = (e: ts.Node): boolean =>
  narrow(e, ts.isPropertyAccessExpression)?.name.text === 'body';

const RULES: ((e: ts.Node) => SendArg | undefined)[] = [
  (e) => (NOT_AN_OBJECT.has(e.kind) || isBodyAccess(e) ? 'body' : undefined),
  (e) => {
    const literal = narrow(e, ts.isObjectLiteralExpression);
    return literal && literalArg(literal);
  },
  (e) => {
    const id = narrow(e, ts.isIdentifier);
    return id && variableArg(id);
  },
];

/** The third apiSend argument, decided the way sendParts decides it at run time. */
export function sendArgOf(arg: ts.Expression): SendArg {
  const e = unwrap(arg) ?? arg;
  return RULES.map((rule) => rule(e)).find((r) => r !== undefined) ?? 'undecided';
}
