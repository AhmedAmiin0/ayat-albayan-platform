// ESLint's no-dupe-args and no-octal (js.configs.recommended, MIT). In a module or TypeScript file
// both are parse errors, which fail lint anyway; a sloppy-mode script (.cjs) parses them, so these
// keep the check there. Oxlint has no built-in rule for either.

/** A parameter's name: a clash among destructured or default parameters is a parse error. */
const namesOf = (param) => (param.type === 'Identifier' ? [param.name] : []);

export const noDupeArgsRule = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow duplicate arguments in function definitions (ESLint).' },
    schema: [],
    messages: { unexpected: "Duplicate param '{{name}}'." },
  },
  create(context) {
    const check = (node) => {
      const names = node.params.flatMap(namesOf);
      const dupes = new Set(names.filter((name, i) => names.indexOf(name) !== i));
      for (const name of dupes) context.report({ node, messageId: 'unexpected', data: { name } });
    };
    return { FunctionDeclaration: check, FunctionExpression: check };
  },
};

const LEGACY_OCTAL = /^0[0-9]/u;

export const noOctalRule = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow octal literals (ESLint).' },
    schema: [],
    messages: { noOctal: 'Octal literals should not be used.' },
  },
  create(context) {
    return {
      Literal(node) {
        const legacy = typeof node.value === 'number' && LEGACY_OCTAL.test(node.raw ?? '');
        if (legacy) context.report({ node, messageId: 'noOctal' });
      },
    };
  },
};
