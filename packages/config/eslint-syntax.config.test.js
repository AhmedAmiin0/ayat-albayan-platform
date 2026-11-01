// docs/36 §1: every selector group reaches the real package configs, next to the React
// no-restricted-syntax list (a second block for the same files must not drop either one).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESLint } from 'eslint';
import { config, reactConfig, reactRestrictions, SYNTAX, syntaxExempt } from './eslint.js';

const root = import.meta.dirname;
const groups = Object.keys(SYNTAX);
const rulesFor = async (blocks, file) => {
  const eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: blocks });
  return (await eslint.calculateConfigForFile(file)).rules;
};
const on = (rules, rule) => rules[rule]?.[0] === 2;

test('config(): every group and the fetch global are errors with their selectors; tests exempt H-1/Z-2', async () => {
  const rules = await rulesFor(config(root), 'src/a.ts');
  for (const rule of [...groups, 'no-restricted-globals']) assert.ok(on(rules, rule), rule);
  for (const [name, list] of Object.entries(SYNTAX)) {
    assert.deepEqual(rules[name].slice(1), list, name);
  }
  const tests = await rulesFor(config(root), 'src/a.test.ts');
  assert.deepEqual(['no-restricted-globals', 'ab/no-global-fetch', 'ab/no-shape-checks'].map((r) => on(tests, r)), [false, false, false]);
  assert.ok(on(tests, 'ab/no-if-chains'));
});

test('reactConfig + reactRestrictions: the React list and every group, on .ts and .tsx', async () => {
  const react = reactRestrictions({ files: ['src/**/*.{ts,tsx}'], effects: ['src/**/*.tsx'], compiler: true, react19: true });
  const blocks = reactConfig(root, ...react);
  for (const file of ['src/a.ts', 'src/a.tsx']) {
    const rules = await rulesFor(blocks, file);
    assert.ok(on(rules, 'no-restricted-syntax'), file);
    for (const rule of groups) assert.ok(on(rules, rule), `${file} ${rule}`);
  }
});

test('an exempt path keeps every other group', async () => {
  const blocks = config(root, syntaxExempt({ files: ['src/http/**'], http: true }));
  const rules = await rulesFor(blocks, 'src/http/a.ts');
  assert.ok(!on(rules, 'no-restricted-globals') && !on(rules, 'ab/no-global-fetch'));
  for (const rule of groups.filter((r) => r !== 'ab/no-global-fetch')) assert.ok(on(rules, rule), rule);
});
