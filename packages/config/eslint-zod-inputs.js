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
const isRawInput = (spec) => spec.type === 'ImportSpecifier' && Object.hasOwn(REPLACEMENTS, importedName(spec));
const PARAMETERS = ['Identifier', 'AssignmentPattern', 'ObjectPattern', 'ArrayPattern', 'TSParameterProperty'];
const isParameter = (node) => PARAMETERS.includes(node.parent?.type ?? '');

/** The callee name of `@X(...)` or `@X`, or undefined for member and other expressions. */
const calleeOf = (expression) => (expression.type === 'CallExpression' ? expression.callee : expression).name;

export const zodInputsRule = {
  meta: {
    type: 'problem',
    docs: { description: 'Nest inputs go through a zod decorator, never raw @Body/@Query/@Param/@Headers (docs/36 Z-1).' },
    schema: [],
    messages: { raw: '@{{name}} reads an unparsed input: use @{{replacement}} (docs/36 Z-1).' },
  },
  create(context) {
    /** Local binding → the imported @nestjs/common name, aliases included. */
    const locals = new Map();
    return {
      ImportDeclaration(node) {
        const specs = node.source.value === NEST ? node.specifiers.filter(isRawInput) : [];
        for (const spec of specs) locals.set(spec.local.name, importedName(spec));
      },
      Decorator(node) {
        const name = locals.get(calleeOf(node.expression));
        if (name === undefined || !isParameter(node)) return;
        context.report({ node, messageId: 'raw', data: { name, replacement: REPLACEMENTS[name] } });
      },
    };
  },
};
