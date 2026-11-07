// The Oxlint baseline (docs/31b-oxlint-mapping.md §4). Oxlint has no bulk suppressions, so the
// violations that predate a rule sit in each package's oxlint-suppressions.json, in the shape of
// ESLint's eslint-suppressions.json: { "<package-relative file>": { "<rule>": { "count": n } } }.
// The gate reads Oxlint's JSON report (`--format json`) and holds every file to its exact
// per-rule count: above it fails (a new violation), below it fails until pruned (`--prune`
// rewrites the files; a count only ever goes down, an entry never appears).
import { relative } from 'node:path';

/** Oxlint's diagnostic plugin → the prefix of its rule key in the config (eslint: none). */
const SCOPES = {
  eslint: '',
  typescript: 'typescript/',
  'typescript-eslint': 'typescript/',
  jsx_a11y: 'jsx-a11y/',
  'react-hooks': 'react/',
};
const CODE = /^([\w-]+)\((.+)\)$/;

/** `typescript-eslint(no-unsafe-call)` → `typescript/no-unsafe-call`; a parse error has no rule. */
export function ruleOf(code) {
  const match = CODE.exec(code ?? '');
  if (!match) return 'parse-error';
  const [, plugin, rule] = match;
  return `${SCOPES[plugin] ?? `${plugin}/`}${rule}`;
}

/** The package folder (of `dirs`, repo-relative) that holds `file`, or '' for none. */
export function packageOf(file, dirs) {
  const holders = dirs.filter((dir) => file.startsWith(`${dir}/`));
  return holders.sort((a, b) => b.length - a.length)[0] ?? '';
}

const bump = (tree, keys) => {
  const [dir, file, rule] = keys;
  const byFile = (tree[dir] ??= {});
  const byRule = (byFile[file] ??= {});
  byRule[rule] = { count: (byRule[rule]?.count ?? 0) + 1 };
};

/** Report diagnostics → { packageDir: { file: { rule: { count } } } } (files package-relative). */
export function countsOf(diagnostics, dirs) {
  const tree = {};
  for (const { filename, code } of diagnostics) {
    const dir = packageOf(filename, dirs);
    const file = dir === '' ? filename : relative(dir, filename);
    bump(tree, [dir, file, ruleOf(code)]);
  }
  return tree;
}

const entries = (byFile) =>
  Object.entries(byFile).flatMap(([file, rules]) =>
    Object.entries(rules).map(([rule, { count }]) => ({ file, rule, count })),
  );

/** Every count of `now` above `base`, and every one below it, as `dir/file rule a -> b` lines. */
export function compare(dir, now, base) {
  const line = ({ file, rule }, [from, to]) => `${dir}/${file} ${rule} ${from} -> ${to}`;
  const above = entries(now)
    .filter((e) => e.count > (base[e.file]?.[e.rule]?.count ?? 0))
    .map((e) => line(e, [base[e.file]?.[e.rule]?.count ?? 0, e.count]));
  const below = entries(base)
    .filter((e) => e.count > (now[e.file]?.[e.rule]?.count ?? 0))
    .map((e) => line(e, [e.count, now[e.file]?.[e.rule]?.count ?? 0]));
  return { above, below };
}

/** `base` with every count lowered to `now` (zero: the entry goes); never raised, never added. */
export function pruned(now, base) {
  const out = {};
  for (const { file, rule, count } of entries(base)) {
    const kept = Math.min(count, now[file]?.[rule]?.count ?? 0);
    if (kept > 0) (out[file] ??= {})[rule] = { count: kept };
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : 1)));
}
