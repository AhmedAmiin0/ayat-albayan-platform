// docs/32 R8 (D2): import bans under their own rule name. Flat config replaces a rule's options per
// block, so a second `no-restricted-imports` block would drop the ones a package already sets (api
// settings readers, mobile AppText and route imports); `ab/forbidden-imports` composes with them.

const rule = {
  meta: {
    type: 'problem',
    docs: { description: 'Forbid an import source, or some of its names (docs/32 R8).' },
    schema: [
      {
        type: 'object',
        properties: {
          bans: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                regex: { type: 'string' },
                names: { type: 'array', items: { type: 'string' } },
                message: { type: 'string' },
              },
              required: ['regex', 'message'],
              additionalProperties: false,
            },
          },
        },
        required: ['bans'],
        additionalProperties: false,
      },
    ],
    messages: { banned: '{{message}}' },
  },
  create(context) {
    const bans = context.options[0].bans.map((ban) => ({ ...ban, re: new RegExp(ban.regex) }));
    const imported = (spec) => spec.imported?.name ?? spec.local?.name;
    const reaches = (spec, names) =>
      spec.type === 'ImportNamespaceSpecifier' || names.includes(imported(spec));
    const check = (node) => {
      const source = node.source?.value;
      if (typeof source !== 'string') return;
      for (const ban of bans.filter((b) => b.re.test(source))) {
        // `import * as x` and `export * from` reach every name, the banned ones included.
        const whole = node.type === 'ExportAllDeclaration' || !ban.names;
        const hits = whole ? [node] : (node.specifiers ?? []).filter((s) => reaches(s, ban.names));
        for (const hit of hits) context.report({ node: hit, messageId: 'banned', data: { message: ban.message } });
      }
    };
    return { ImportDeclaration: check, ExportNamedDeclaration: check, ExportAllDeclaration: check };
  },
};

export const forbiddenImportsRule = rule;
