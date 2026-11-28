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

// A function the file writes itself under that name (an inject wrapper, a sidecar client) is not
// the api client; an imported call or a callWith(client) result is.
const FUNCTION_TYPES = new Set(['ArrowFunctionExpression', 'FunctionExpression']);
const isOwnHelper = (declarator) =>
  CALLEES.has(declarator.id?.name) && FUNCTION_TYPES.has(declarator.init?.type);

export const noApiPathLiteralRule = {
  meta: {
    type: 'problem',
    docs: { description: 'An api call names a route object, never a path literal.' },
    schema: [],
    messages: { literal: 'Pass the route object: call({ route, params }) or routePath(route).' },
  },
  create(context) {
    const helpers = new Set();
    const literals = [];
    return {
      FunctionDeclaration(node) {
        if (CALLEES.has(node.id?.name)) helpers.add(node.id.name);
      },
      VariableDeclarator(node) {
        if (isOwnHelper(node)) helpers.add(node.id.name);
      },
      CallExpression(node) {
        const named = node.callee.type === 'Identifier' && CALLEES.has(node.callee.name);
        if (named && startsWithSlash(pathOf(node.arguments[0]))) literals.push(node);
      },
      'Program:exit'() {
        literals
          .filter((node) => !helpers.has(node.callee.name))
          .forEach((node) => context.report({ node, messageId: 'literal' }));
      },
    };
  },
};
