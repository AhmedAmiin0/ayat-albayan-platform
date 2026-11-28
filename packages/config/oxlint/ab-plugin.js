// The `ab` plugin for Oxlint (a JS plugin: ESLint's rule API): the repo's own rules
// (eslint-boundaries.js, contract-rules/), the decorator-aware consistent-type-imports for the
// api, and the ESLint core rules Oxlint has no native version of: no-restricted-syntax (the React
// lists) and js recommended's no-dupe-args / no-octal.
import { contractRules } from '../contract-rules/index.js';
import { boundariesPlugin } from '../eslint-boundaries.js';
import { noDupeArgsRule, noOctalRule } from '../legacy-js.js';
import { restrictedSyntaxRule } from '../restricted-syntax.js';
import { consistentTypeImportsRule } from '../type-imports/index.js';

export default {
  meta: { name: 'ab' },
  rules: {
    ...boundariesPlugin.rules,
    ...contractRules,
    'no-restricted-syntax': restrictedSyntaxRule,
    'no-dupe-args': noDupeArgsRule,
    'no-octal': noOctalRule,
    'consistent-type-imports': consistentTypeImportsRule,
  },
};
