// docs/27 §1 rule 6: import another module only through its index.ts, never its internals.
// A "module" is the first path under the package root that matches `module` (a regex source), e.g.
// `src/modules/[^/]+/[^/]+` for the api. Imports inside the same module, and of shared folders that match
// no module, are free. Existing deep imports live in each package's eslint-suppressions.json (ESLint bulk
// suppressions); a new one fails lint.
import { dirname, relative, resolve } from 'node:path';

const INDEX = /^\/index(\.[cm]?[jt]sx?)?$/;

/** The module root (package-relative, no trailing slash) that `rel` sits in, or null. */
export function moduleOf(rel, module) {
  const m = `${rel}/`.match(new RegExp(`^(${module})/`));
  return m ? m[1] : null;
}

/** Package-relative path an import specifier points at, or null for a package import. */
export function target(spec, { file, cwd, alias }) {
  if (spec.startsWith('.')) return relative(cwd, resolve(dirname(file), spec));
  for (const [prefix, to] of Object.entries(alias ?? {})) {
    if (spec.startsWith(prefix)) return relative(cwd, resolve(cwd, to, spec.slice(prefix.length)));
  }
  return null;
}

/** True when `spec`, imported from `file`, reaches into another module's internals. */
export function isDeep(spec, { file, cwd, alias, module }) {
  const to = target(spec, { file, cwd, alias });
  if (to === null) return false;
  const toModule = moduleOf(to, module);
  if (toModule === null || toModule === moduleOf(relative(cwd, file), module)) return false;
  const rest = to.slice(toModule.length);
  return rest !== '' && !INDEX.test(rest);
}

const rule = {
  meta: {
    type: 'problem',
    docs: { description: "Import another module only through its index.ts (docs/27 §1 rule 6)." },
    schema: [
      {
        type: 'object',
        properties: {
          root: { type: 'string' },
          module: { type: 'string' },
          alias: { type: 'object', additionalProperties: { type: 'string' } },
        },
        required: ['root', 'module'],
        additionalProperties: false,
      },
    ],
    messages: { deep: "Import '{{module}}' through its index.ts, not '{{spec}}'." },
  },
  create(context) {
    // Paths are relative to the package root, so linting from the repo root gives the same result.
    const { root, module, alias } = context.options[0];
    const opts = { file: context.filename, cwd: root, alias, module };
    const check = (node) => {
      const spec = node?.source?.value;
      if (typeof spec !== 'string' || !isDeep(spec, opts)) return;
      const to = target(spec, opts) ?? '';
      context.report({ node: node.source, messageId: 'deep', data: { spec, module: moduleOf(to, module) } });
    };
    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
      ImportExpression: check,
    };
  },
};

export const boundariesPlugin = { rules: { 'module-boundaries': rule } };

// Test code may import another module's fakes and fixtures and mock its internals by path.
export const TESTS = ['**/*.test.*', '**/*.spec.*', '**/*.fake.ts', '**/*.fakes.ts', '**/*fixture*', '**/*test-app*.ts', '**/test/**', '**/testing/**'];

/** Flat-config block: the rule as an error for `files` of the package at `root` (its config's directory). */
export function boundaries({ root, files, module, alias, ignores = [] }) {
  return {
    files,
    ignores: [...TESTS, ...ignores],
    plugins: { ab: boundariesPlugin },
    rules: { 'ab/module-boundaries': ['error', alias ? { root, module, alias } : { root, module }] },
  };
}
