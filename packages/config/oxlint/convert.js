// ESLint flat-config blocks (each package's lint.blocks.js) → Oxlint overrides, scoped to the
// package folder: `files` → `files`, `ignores` → `excludeFiles` (the block does not apply there,
// as in flat config), a block of `ignores` only → ignorePatterns. Rule names follow
// docs/31b-oxlint-mapping.md; options are passed through unchanged.

/** ESLint rules that run under another name in Oxlint (JS plugins or native aliases). */
const RENAMES = {
  'max-len': 'stylistic/max-len',
  // typescript-eslint extension rules whose Oxlint version is the core rule (TS-aware there).
  '@typescript-eslint/no-empty-function': 'no-empty-function',
  '@typescript-eslint/no-unused-expressions': 'no-unused-expressions',
  'no-restricted-syntax': 'ab/no-restricted-syntax',
  'no-dupe-args': 'ab/no-dupe-args',
  'no-octal': 'ab/no-octal',
  'react-hooks/config': 'react-hooks-js/config',
  'react-hooks/gating': 'react-hooks-js/gating',
};
const PREFIXES = [
  ['@typescript-eslint/', 'typescript/'],
  ['react-hooks/', 'react/'],
];

/** The Oxlint key of an ESLint rule name. */
export function oxlintName(rule) {
  const prefix = PREFIXES.find(([from]) => rule.startsWith(from));
  const renamed = prefix ? `${prefix[1]}${rule.slice(prefix[0].length)}` : rule;
  return RENAMES[rule] ?? renamed;
}

const renameRules = (rules = {}) =>
  Object.fromEntries(Object.entries(rules).map(([rule, value]) => [oxlintName(rule), value]));

/** `pattern` (package-relative, flat-config style) under the package folder `dir`. */
const scoped = (dir, pattern) => `${dir}/${pattern}`;

const isGlobalIgnore = (block) => Boolean(block.ignores) && !block.files && !block.rules;

// What a block may carry: anything else (languageOptions, another plugin) would be lost in
// Oxlint. `plugins: { ab }` is ESLint's registration; config.js registers `ab` for every file.
const KEYS = new Set(['name', 'files', 'ignores', 'rules', 'env']);
const isAbOnly = (plugins) => Object.keys(plugins).every((name) => name === 'ab');
const kept = (block) => (key) => KEYS.has(key) || (key === 'plugins' && isAbOnly(block.plugins));

/** One block → an override (`files` default: every file of the package). */
function toOverride(dir, block) {
  const unknown = Object.keys(block).filter((key) => !kept(block)(key));
  if (unknown.length > 0) throw new Error(`${dir}: lint block key(s) Oxlint drops: ${unknown}`);
  const files = (block.files ?? ['**/*']).map((pattern) => scoped(dir, pattern));
  const exclude = (block.ignores ?? []).map((pattern) => scoped(dir, pattern));
  const env = block.env ? { env: block.env } : {};
  const excludeFiles = exclude.length > 0 ? { excludeFiles: exclude } : {};
  return { files, ...excludeFiles, ...env, rules: renameRules(block.rules) };
}

/** A package's blocks → its ignorePatterns and overrides, in order. */
export function toOverrides(dir, blocks) {
  const ignores = blocks.filter(isGlobalIgnore).flatMap((block) => block.ignores);
  const overrides = blocks.filter((block) => !isGlobalIgnore(block));
  return {
    ignorePatterns: ignores.map((pattern) => scoped(dir, pattern)),
    overrides: overrides.map((block) => toOverride(dir, block)),
  };
}
