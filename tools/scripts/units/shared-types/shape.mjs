// Shape keys: two declarations with one key hold the same literal set, or the same keys with the
// same value types. A set of one literal or an object of one key matches too much to group.
import ts from 'typescript';

const squash = (text) => text.replace(/\s+/g, '');
const byText = (a, b) => (a < b ? -1 : Number(a > b));
const isNegative = (node) =>
  ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken;

const LITERALS = {
  [ts.SyntaxKind.StringLiteral]: (node) => JSON.stringify(node.text),
  [ts.SyntaxKind.NoSubstitutionTemplateLiteral]: (node) => JSON.stringify(node.text),
  [ts.SyntaxKind.NumericLiteral]: (node) => String(Number(node.text)),
  [ts.SyntaxKind.PrefixUnaryExpression]: (node) =>
    isNegative(node) && ts.isNumericLiteral(node.operand) ? `-${Number(node.operand.text)}` : null,
};

/** The encoded literal of a string or number literal node, or null. */
export const literalOf = (node) => LITERALS[node.kind]?.(node) ?? null;

/** `lit:` key of a literal list, or null when any is not a literal or fewer than two remain. */
export function literalShape(nodes) {
  const values = nodes.map(literalOf);
  const usable = values.length >= 2 && values.every((v) => v !== null);
  return usable ? `lit:${[...new Set(values)].toSorted(byText).join('|')}` : null;
}

const unionMembers = (type) => (ts.isUnionTypeNode(type) ? [...type.types] : [type]);

/** The literal nodes of a union of literal types, or null when one member is something else. */
export function unionLiterals(type) {
  const members = unionMembers(type);
  const all = members.every((m) => ts.isLiteralTypeNode(m) && literalOf(m.literal) !== null);
  return all ? members.map((m) => m.literal) : null;
}

const memberText = (member, sf) => squash(member.getText(sf)).replace(/[;,]$/, '');
const paramsText = (params, sf) =>
  params ? `<${params.map((p) => squash(p.getText(sf))).join(',')}>` : '';
const basesText = (clauses, sf) => {
  const bases = (clauses ?? []).flatMap((c) => c.types.map((t) => squash(t.getText(sf))));
  return { count: bases.length, text: bases.length === 0 ? '' : ` extends ${bases.join(',')}` };
};

/** `obj` key of an interface or a type literal: its type parameters, bases and members. */
export function typeShape({ members, typeParameters, heritageClauses }, sf) {
  const bases = basesText(heritageClauses, sf);
  if (members.length + bases.count < 2) return null;
  const body = members.map((m) => memberText(m, sf)).toSorted(byText);
  return `obj${paramsText(typeParameters, sf)}${bases.text}{${body.join(';')}}`;
}

/** The expression under parentheses, `satisfies` and a final `as const`, or null without one. */
export function constValue(expr) {
  const inner = ts.isParenthesizedExpression(expr) || ts.isSatisfiesExpression(expr);
  if (inner) return constValue(expr.expression);
  const isConst = ts.isAsExpression(expr) && ts.isConstTypeReference(expr.type);
  return isConst ? stripParens(expr.expression) : null;
}

const stripParens = (expr) =>
  ts.isParenthesizedExpression(expr) ? stripParens(expr.expression) : expr;

const keyText = (name, sf) =>
  ts.isComputedPropertyName(name) ? squash(name.getText(sf)) : name.text;

const propertyShape = (prop, sf) => {
  const value = ts.isPropertyAssignment(prop) ? valueShape(prop.initializer, sf) : 'unknown';
  return prop.name ? `${keyText(prop.name, sf)}:${value}` : `...${squash(prop.getText(sf))}`;
};

const objectShape = (node, sf) =>
  `{${node.properties
    .map((p) => propertyShape(p, sf))
    .toSorted(byText)
    .join(';')}}`;

const VALUES = {
  [ts.SyntaxKind.StringLiteral]: () => 'string',
  [ts.SyntaxKind.NoSubstitutionTemplateLiteral]: () => 'string',
  [ts.SyntaxKind.TemplateExpression]: () => 'string',
  [ts.SyntaxKind.NumericLiteral]: () => 'number',
  [ts.SyntaxKind.PrefixUnaryExpression]: () => 'number',
  [ts.SyntaxKind.TrueKeyword]: () => 'boolean',
  [ts.SyntaxKind.FalseKeyword]: () => 'boolean',
  [ts.SyntaxKind.NullKeyword]: () => 'null',
  [ts.SyntaxKind.ObjectLiteralExpression]: objectShape,
  [ts.SyntaxKind.ArrayLiteralExpression]: (node, sf) =>
    `[${node.elements.map((e) => valueShape(e, sf)).join(',')}]`,
};

function valueShape(expr, sf) {
  const node = stripParens(expr);
  return VALUES[node.kind]?.(node, sf) ?? 'unknown';
}

/** `obj` key of an `as const` object literal: its keys with widened value types, nested. */
export const constObjectShape = (node, sf) =>
  node.properties.length >= 2 ? `obj${objectShape(node, sf)}` : null;
