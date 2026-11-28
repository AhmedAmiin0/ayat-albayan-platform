// docs/62 part 3 §3: a client asks for a route object, never for a path it spells out, so a
// path is written once, in the route table.
const CALLEES = new Set(['call', 'publicCall']);

const LEADING_TEXT = {
  Literal: (node) => String(node.value),
  TemplateLiteral: (node) => node.quasis[0].value.cooked,
};
const startsWithSlash = (node) => (LEADING_TEXT[node?.type]?.(node) ?? '').startsWith('/');
const keyName = (prop) => prop.key?.name ?? prop.key?.value;
const pathOf = (arg) =>
  arg?.type === 'ObjectExpression'
    ? arg.properties.find((prop) => prop.type === 'Property' && keyName(prop) === 'path')?.value
    : arg;

export const noApiPathLiteralRule = {
  meta: {
    type: 'problem',
    docs: { description: 'An api call names a route object, never a path literal.' },
    schema: [],
    messages: { literal: 'Pass the route object: call({ route, params }) or routePath(route).' },
  },
  create(context) {
    return {
      CallExpression(node) {
        const named = node.callee.type === 'Identifier' && CALLEES.has(node.callee.name);
        if (!named || !startsWithSlash(pathOf(node.arguments[0]))) return;
        context.report({ node, messageId: 'literal' });
      },
    };
  },
};
