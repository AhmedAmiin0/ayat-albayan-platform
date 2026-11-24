// docs/36 F-2 + F-3 (D4, CLAUDE.md rule 11): few ifs. Depth 2 and complexity 8 everywhere; plain
// `.ts` (no JSX: services, mappers, hooks' helpers) gets 6. Complexity counts `&&`, `||`, `??`,
// `?.` and default values, which is why `.tsx` keeps 8; `variant: 'classic'` also counts each
// `case`. The limits stay literal: the lint gate reads them from the config source (a lower
// limit: its one-time baseline).
export const flowRules = {
  complexity: ['error', { max: 8, variant: 'classic' }],
  'max-depth': ['error', 2],
  'no-nested-ternary': 'error',
  'no-lonely-if': 'error',
  'no-else-return': 'error',
};
