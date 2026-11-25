// docs/36 §1: every selector group reaches the composed Oxlint config, next to the React
// no-restricted-syntax list (a second block for the same files must not drop either one).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reactRestrictions } from './eslint-react.js';
import { SYNTAX, syntaxExempt } from './eslint-syntax.js';
import { packageOverrides } from './oxlint/config.js';
import { rulesFor } from './oxlint/resolve.js';

const groups = Object.keys(SYNTAX);
const rulesOf = ({ react = false, blocks = [] }, file) =>
  rulesFor({ rules: {}, ...packageOverrides({ dir: 'pkg', react, blocks }) }, `pkg/${file}`);

test('every group and the fetch global are errors with their selectors; tests exempt H-1/Z-2', () => {
  const rules = rulesOf({}, 'src/a.ts');
  assert.ok(rules['no-restricted-globals'], 'no-restricted-globals');
  for (const [name, list] of Object.entries(SYNTAX)) assert.deepEqual(rules[name], ['error', ...list]);
  const tests = rulesOf({}, 'src/a.test.ts');
  const exempt = ['no-restricted-globals', 'ab/no-global-fetch', 'ab/no-shape-checks'];
  assert.deepEqual(exempt.map((r) => Boolean(tests[r])), [false, false, false]);
  assert.ok(tests['ab/no-if-chains']);
});

test('a React package with reactRestrictions: the React list and every group, on .ts and .tsx', () => {
  const files = ['src/**/*.{ts,tsx}'];
  const blocks = reactRestrictions({ files, effects: ['src/**/*.tsx'], compiler: true, react19: true });
  for (const file of ['src/a.ts', 'src/a.tsx']) {
    const rules = rulesOf({ react: true, blocks }, file);
    assert.ok(rules['ab/no-restricted-syntax'], file);
    for (const rule of groups) assert.ok(rules[rule], `${file} ${rule}`);
  }
});

test('an exempt path keeps every other group', () => {
  const blocks = [syntaxExempt({ files: ['src/http/**'], http: true })];
  const rules = rulesOf({ blocks }, 'src/http/a.ts');
  assert.ok(!rules['no-restricted-globals'] && !rules['ab/no-global-fetch']);
  for (const rule of groups.filter((r) => r !== 'ab/no-global-fetch')) assert.ok(rules[rule], rule);
});
