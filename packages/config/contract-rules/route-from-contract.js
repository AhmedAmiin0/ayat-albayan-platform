// docs/62 part 3 §2: a controller handler takes its method and path from its route object
// through @Route, so a path is written once, in the package beside its schemas.
const NEST = '@nestjs/common';
const VERBS = new Set(['Get', 'Post', 'Put', 'Patch', 'Delete']);
const CONTROLLER = /\.controller\.ts$/;

const bindingsOf = (spec) =>
  spec.type === 'ImportSpecifier' ? [[spec.local.name, spec.imported.name]] : [];
const namespaceOf = (spec) => (spec.type === 'ImportNamespaceSpecifier' ? [spec.local.name] : []);

export const routeFromContractRule = {
  meta: {
    type: 'problem',
    docs: { description: 'A controller handler takes its method and path from @Route.' },
    schema: [],
    messages: { verb: '@{{name}} writes the path by hand: use @Route(<feature>Routes.<name>).' },
  },
  create(context) {
    if (!CONTROLLER.test(context.filename)) return {};
    const locals = new Map();
    const namespaces = new Set();
    const names = {
      Identifier: (callee) => locals.get(callee.name),
      MemberExpression: (callee) => namespaces.has(callee.object.name) && callee.property.name,
    };
    const nameOf = (callee) => names[callee.type]?.(callee);
    return {
      ImportDeclaration(node) {
        const specs = node.source.value === NEST ? node.specifiers : [];
        for (const [local, name] of specs.flatMap(bindingsOf)) locals.set(local, name);
        for (const local of specs.flatMap(namespaceOf)) namespaces.add(local);
      },
      Decorator(node) {
        const call = node.expression;
        const name = call.type === 'CallExpression' ? nameOf(call.callee) : undefined;
        if (!VERBS.has(name)) return;
        context.report({ node, messageId: 'verb', data: { name } });
      },
    };
  },
};
