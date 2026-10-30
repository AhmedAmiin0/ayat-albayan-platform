// docs/32 R2 + D1: at most 3 parameters per function, 4 per constructor (Nest DI). Unlike
// @typescript-eslint/max-params it also counts method signatures and abstract or overload bodies
// (TSMethodSignature, TSEmptyBodyFunctionExpression): an interface cannot declare
// `fillRect(x, y, w, h)`.
// A `this` parameter is a type annotation, not an argument, and is not counted.

const MAX = 3;
const MAX_CONSTRUCTOR = 4;

const FUNCTIONS = [
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'TSDeclareFunction',
  'TSEmptyBodyFunctionExpression',
  'TSFunctionType',
  'TSConstructorType',
  'TSMethodSignature',
  'TSCallSignatureDeclaration',
  'TSConstructSignatureDeclaration',
];

const isThis = (param) => param.type === 'Identifier' && param.name === 'this';

/** True for a class constructor body and an interface's `new (...)` signature. */
function isConstructor(node) {
  if (node.type === 'TSConstructSignatureDeclaration' || node.type === 'TSConstructorType') return true;
  const parent = node.parent;
  return parent?.type === 'MethodDefinition' || parent?.type === 'TSAbstractMethodDefinition'
    ? parent.kind === 'constructor'
    : false;
}

export const maxParamsRule = {
  meta: {
    type: 'suggestion',
    docs: { description: 'At most 3 parameters per function and 4 per constructor (docs/32 R2, D1).' },
    schema: [],
    messages: { tooMany: '{{count}} parameters (max {{max}}): take a typed options object instead.' },
  },
  create(context) {
    const check = (node) => {
      const count = (node.params ?? node.parameters ?? []).filter((p) => !isThis(p)).length;
      const max = isConstructor(node) ? MAX_CONSTRUCTOR : MAX;
      if (count > max) context.report({ node, messageId: 'tooMany', data: { count, max } });
    };
    return Object.fromEntries(FUNCTIONS.map((type) => [type, check]));
  },
};
