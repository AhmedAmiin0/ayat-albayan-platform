// ESLint's no-restricted-syntax (MIT), as a plain rule object: every `ab/*` selector group and the
// React lists run this one implementation as an Oxlint JS plugin rule (Oxlint matches the same
// esquery selectors and has no built-in version of the rule).

const SCHEMA = {
  type: 'array',
  items: {
    oneOf: [
      { type: 'string' },
      {
        type: 'object',
        properties: { selector: { type: 'string' }, message: { type: 'string' } },
        required: ['selector'],
        additionalProperties: false,
      },
    ],
  },
  uniqueItems: true,
};

/** `selector` or `{ selector, message }` → its selector and the reported message. */
const entryOf = (option) => {
  const { selector, message } = typeof option === 'string' ? { selector: option } : option;
  return { selector, message: message || `Using '${selector}' is not allowed.` };
};

export const restrictedSyntaxRule = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow specified syntax (ESLint no-restricted-syntax).' },
    schema: SCHEMA,
    messages: { restrictedSyntax: '{{message}}' },
  },
  create(context) {
    const visitor = {};
    for (const { selector, message } of context.options.map(entryOf)) {
      visitor[selector] = (node) =>
        context.report({ node, messageId: 'restrictedSyntax', data: { message } });
    }
    return visitor;
  },
};
