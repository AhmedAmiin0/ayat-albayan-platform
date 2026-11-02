// docs/36 Z-1: every Nest input is parsed by a zod schema before the handler runs. A parameter
// decorated with @nestjs/common's raw `@Body`/`@Query`/`@Param`/`@Headers` (bare, with a pipe such
// as ParseUUIDPipe, or under an import alias) is reported; the zod decorators of
// `common/http/zod-inputs.ts` call those factories as plain functions, never as decorators.
// Exempt by design: `@Req` (the webhook raw body, whose signature is checked on its bytes first).

const NEST = '@nestjs/common';

/** The raw Nest factory → the zod decorator that replaces it (docs/36 Z-1). */
const REPLACEMENTS = {
  Body: 'ZodBody(schema)',
  Query: 'ZodQuery(schema)',
  Param: 'ZodParam(name, schema)',
  Headers: 'ZodHeaders(schema)',
};

const importedName = (spec) => spec.imported?.name ?? spec.imported?.value;
const isRaw = (name) => Object.hasOwn(REPLACEMENTS, name);
const PARAMETERS = [
  'Identifier',
  'AssignmentPattern',
  'ObjectPattern',
  'ArrayPattern',
  'RestElement',
  'TSParameterProperty',
];
const isParameter = (node) => PARAMETERS.includes(node.parent?.type ?? '');

/** Local binding → imported name: `{ Body as B }` → B: Body; `* as N` → `N.Body`: Body. */
const BINDINGS = {
  ImportSpecifier: (spec) => [[spec.local.name, importedName(spec)]],
  ImportNamespaceSpecifier: (spec) =>
    Object.keys(REPLACEMENTS).map((name) => [`${spec.local.name}.${name}`, name]),
};
const bindingsOf = (spec) => (BINDINGS[spec.type]?.(spec) ?? []).filter(([, name]) => isRaw(name));

/** `X` or `N.X` of `@X(...)` / `@N.X(...)` / `@X`; undefined for other expressions. */
const KEYS = {
  Identifier: (node) => node.name,
  MemberExpression: (node) => `${node.object.name}.${node.property.name}`,
};
const keyOf = (expression) => {
  const callee = expression.type === 'CallExpression' ? expression.callee : expression;
  return KEYS[callee.type]?.(callee);
};

export const zodInputsRule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Nest inputs go through a zod decorator, never raw @Body/@Query/@Param/@Headers (docs/36 Z-1).',
    },
    schema: [],
    messages: { raw: '@{{name}} reads an unparsed input: use @{{replacement}} (docs/36 Z-1).' },
  },
  create(context) {
    /** Local binding → the imported @nestjs/common name, aliases included. */
    const locals = new Map();
    return {
      ImportDeclaration(node) {
        const specs = node.source.value === NEST ? node.specifiers : [];
        for (const [local, name] of specs.flatMap(bindingsOf)) locals.set(local, name);
      },
      Decorator(node) {
        const name = locals.get(keyOf(node.expression));
        if (name === undefined || !isParameter(node)) return;
        context.report({ node, messageId: 'raw', data: { name, replacement: REPLACEMENTS[name] } });
      },
    };
  },
};
