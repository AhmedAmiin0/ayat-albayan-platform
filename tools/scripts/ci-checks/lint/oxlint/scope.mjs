// LINT_SCOPE: which packages one ci «verify» lint row checks (Oxlint, its baselines and the
// parity). The api row sets `apps/api`, the other row `!apps/api`: complementary by
// construction, so together they cover every package (ci-lint-row.test.mjs). Unset = every
// package, as before. A scope naming no package fails: a row never checks nothing silently.

const KEEP = {
  all: () => true,
  only: (dir, name) => dir === name,
  except: (dir, name) => dir !== name,
};

const kindOf = (scope) => (scope.startsWith('!') ? 'except' : 'only');

/** `` → all; `apps/api` → { kind: only, name }; `!apps/api` → { kind: except, name }. */
export const parseScope = (scope = '') => ({
  kind: scope ? kindOf(scope) : 'all',
  name: scope.replace(/^!/, ''),
});

/** `dirs` (repo-relative package folders) kept by `scope` (empty or unset: all of them). */
export function scoped(dirs, scope = '') {
  const { kind, name } = parseScope(scope);
  if (kind !== 'all' && !dirs.includes(name)) {
    throw new Error(`LINT_SCOPE ${scope}: no package ${name}`);
  }
  return dirs.filter((dir) => KEEP[kind](dir, name));
}
