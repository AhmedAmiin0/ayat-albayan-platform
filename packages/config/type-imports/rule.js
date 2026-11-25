// typescript-eslint's consistent-type-imports (prefer `type-imports`, fixStyle
// `separate-type-imports`, no `import()` type annotations) with `emitDecoratorMetadata` read
// per class: a type in a decorated signature is a runtime value (metadata.js), so Nest's injected
// classes stay value imports while every other type-only import is reported. Oxlint's native rule
// has no decorator-metadata mode; this one replaces it where decorators emit metadata (apps/api).
import { fixPart, fixWhole } from './fix.js';
import { metadataRanges } from './metadata.js';
import { isInlineType, onlyTypes } from './usage.js';

const quoted = (names) => names.map((name) => `"${name}"`);

/** `"A"`, `"A" and "B"`, `"A", "B" and "C"`: typescript-eslint's list. */
function listOf(names) {
  const all = quoted(names);
  return all.length === 1 ? all[0] : `${all.slice(0, -1).join(', ')} and ${all.at(-1)}`;
}

function reportPart({ context, node, types }) {
  const names = types.map((s) => s.local.name);
  context.report({
    node,
    messageId: names.length === 1 ? 'aImportIsOnlyTypes' : 'someImportsAreOnlyTypes',
    data: { typeImports: listOf(names) },
    fix: fixPart({ sourceCode: context.sourceCode, node, types }),
  });
}

function check({ context, node, ranges }) {
  const values = node.specifiers.filter((s) => !isInlineType(s));
  const sourceCode = context.sourceCode;
  const types = values.filter((specifier) => onlyTypes({ sourceCode, specifier, ranges }));
  const whole = types.length === values.length;
  const report = () =>
    whole
      ? context.report({ node, messageId: 'typeOverValue', fix: fixWhole(node) })
      : reportPart({ context, node, types });
  return types.length > 0 ? report() : undefined;
}

export const consistentTypeImportsRule = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Enforce `import type` for type-only imports, decorator-metadata aware.' },
    fixable: 'code',
    schema: [],
    messages: {
      typeOverValue: 'All imports in the declaration are only used as types. Use `import type`.',
      someImportsAreOnlyTypes: 'Imports {{typeImports}} are only used as type.',
      aImportIsOnlyTypes: 'Import {{typeImports}} is only used as types.',
      noImportTypeAnnotations: '`import()` type annotations are forbidden.',
    },
  },
  create(context) {
    const ranges = [];
    const imports = [];
    const addClass = (node) => ranges.push(...metadataRanges(node));
    const isValueImport = (node) => node.importKind !== 'type' && node.specifiers.length > 0;
    return {
      ClassDeclaration: addClass,
      ClassExpression: addClass,
      ImportDeclaration: (node) => imports.push(node),
      TSImportType: (node) => context.report({ node, messageId: 'noImportTypeAnnotations' }),
      'Program:exit': () =>
        imports.filter(isValueImport).forEach((node) => check({ context, node, ranges })),
    };
  },
};
