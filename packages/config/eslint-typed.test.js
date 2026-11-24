import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESLint } from 'eslint';
import { config } from './eslint.js';
import { testRules, typedRules } from './eslint-typed.js';

const root = import.meta.dirname;
const rulesFor = async (file) => {
  const eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: config(root) });
  return (await eslint.calculateConfigForFile(file)).rules;
};
const options = (setting) => [setting].flat().slice(1);
// Oxlint owns some of these rules (.oxlintrc.json), so ESLint resolves them off.
const isOn = (rule) => rule?.[0] === 2;

test('config(): app code gets the typedRules options on every rule ESLint keeps', async () => {
  const rules = await rulesFor('src/a.ts');
  const kept = Object.keys(typedRules).filter((name) => isOn(rules[name]));
  for (const name of kept) assert.deepEqual(rules[name].slice(1), options(typedRules[name]), name);
  assert.ok(kept.includes('@typescript-eslint/restrict-template-expressions'));
  assert.equal(rules['@typescript-eslint/non-nullable-type-assertion-style']?.[0], 0);
});

test('config(): tests turn the testRules off, app code keeps them', async () => {
  const tests = await rulesFor('src/a.test.ts');
  const app = await rulesFor('src/a.ts');
  for (const name of Object.keys(testRules)) {
    assert.equal(tests[name]?.[0], 0, name);
    assert.equal(app[name]?.[0], 2, name);
  }
});
