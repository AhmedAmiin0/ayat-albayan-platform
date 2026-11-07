// The `ab` plugin for Oxlint (a JS plugin: ESLint's rule API). The same rule objects ESLint runs
// (eslint-boundaries.js), plus the ESLint core rules Oxlint has no native version of:
// no-restricted-syntax (the React lists) and js recommended's no-dupe-args / no-octal.
import { boundariesPlugin } from '../eslint-boundaries.js';
import { noDupeArgsRule, noOctalRule } from '../legacy-js.js';
import { restrictedSyntaxRule } from '../restricted-syntax.js';

export default {
  meta: { name: 'ab' },
  rules: {
    ...boundariesPlugin.rules,
    'no-restricted-syntax': restrictedSyntaxRule,
    'no-dupe-args': noDupeArgsRule,
    'no-octal': noOctalRule,
  },
};
