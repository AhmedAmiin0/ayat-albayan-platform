// Owner 2026-10-30: «use the absolute paths for imports». A module path never climbs out of its
// folder with `../`: it names the workspace alias (`@/…` → `src/…`) instead; a sibling (`./x`)
// stays relative, and so does a path the alias cannot name (outside `src/`: mobile app/ routes,
// app.json, web public/). Covers every place a path is written: imports, re-exports, `import()`,
// `import('x').T`, `import x = require()`, require and the vi / jest mock calls.
// `pnpm imports:absolute -- <workspace|paths> --write` rewrites existing ones; those that predate
// the rule sit in eslint-suppressions.json (docs/32 R12).
import { dirname, resolve, sep } from 'node:path';

/** Calls whose first string argument is a module path (as in move-module/specifiers.ts). */
const PATH_CALLS =
  /^(?:(?:vi|jest)\.(?:mock|doMock|unmock|doUnmock|importActual|importMock|requireActual|requireMock|createMockFromModule)|require|require\.resolve)$/;

/** True for `../x` and `..`: a specifier that leaves its own folder. */
export const isParent = (spec) => spec === '..' || spec.startsWith('../');

/** True when `spec` in `file` is `../` into `aliasDir` (absolute): the alias can name it. */
export const aliasable = (spec, { file, aliasDir }) =>
  isParent(spec) && resolve(dirname(file), spec).startsWith(aliasDir + sep);

const calleeName = (callee) => {
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type !== 'MemberExpression' || callee.computed) return '';
  const { object, property } = callee;
  return object.type === 'Identifier' && property.type === 'Identifier' ? `${object.name}.${property.name}` : '';
};

/** The literal node of a static module path, or undefined (a template with `${}` is not a path). */
const pathLiteral = (node) => {
  if (node?.type === 'Literal' && typeof node.value === 'string') return { node, value: node.value };
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return { node, value: node.quasis[0]?.value.cooked ?? '' };
  }
  return undefined;
};

const rule = {
  meta: {
    type: 'problem',
    docs: { description: 'Import through the workspace alias (@/…), never a parent-relative path (../).' },
    schema: [
      {
        type: 'object',
        properties: { root: { type: 'string' }, dir: { type: 'string' } },
        required: ['root', 'dir'],
        additionalProperties: false,
      },
    ],
    messages: {
      parent: "Write '{{spec}}' through the workspace alias (@/…), not ../ (pnpm imports:absolute -- <file> --write).",
    },
  },
  create(context) {
    // `root`: the package folder; `dir`: the alias folder in it (`@/*` → `src/*`).
    const { root, dir } = context.options[0];
    const opts = { file: context.filename, aliasDir: resolve(root, dir) };
    const check = (literal) => {
      if (literal === undefined || !aliasable(literal.value, opts)) return;
      context.report({ node: literal.node, messageId: 'parent', data: { spec: literal.value } });
    };
    const source = (node) => check(pathLiteral(node.source));
    return {
      ImportDeclaration: source,
      ExportNamedDeclaration: source,
      ExportAllDeclaration: source,
      ImportExpression: source,
      TSExternalModuleReference: (node) => check(pathLiteral(node.expression)),
      TSImportType: (node) => check(pathLiteral(node.argument?.literal ?? node.argument)),
      CallExpression: (node) => {
        if (PATH_CALLS.test(calleeName(node.callee))) check(pathLiteral(node.arguments[0]));
      },
    };
  },
};

export const noParentImportsRule = rule;
