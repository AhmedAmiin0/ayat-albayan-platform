// docs/36 F-2/F-3 (D4): the flow limits reach the real package configs, React flavour included.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESLint } from 'eslint';
import { config, reactConfig, reactRestrictions } from './eslint.js';

const root = import.meta.dirname;
const rulesFor = async (blocks, file) => {
  const eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: blocks });
  return (await eslint.calculateConfigForFile(file)).rules;
};
const F2 = ['no-nested-ternary', 'no-lonely-if', 'no-else-return'];

test('config(): complexity 6 on .ts, 8 on .js, classic variant; depth 2; the F-2 rules are errors', async () => {
  const ts = await rulesFor(config(root), 'src/a.ts');
  assert.deepEqual(ts.complexity, [2, { max: 6, variant: 'classic' }]);
  assert.deepEqual(ts['max-depth'], [2, 2]);
  for (const rule of F2) assert.equal(ts[rule]?.[0], 2, rule);
  const js = await rulesFor(config(root), 'src/a.js');
  assert.deepEqual(js.complexity, [2, { max: 8, variant: 'classic' }]);
});

test('reactConfig: .tsx keeps complexity 8, .ts gets 6, depth 2 on both', async () => {
  const react = reactRestrictions({
    files: ['src/**/*.{ts,tsx}'],
    effects: ['src/**/*.tsx'],
    compiler: true,
    react19: true,
  });
  const blocks = reactConfig(root, ...react);
  const tsx = await rulesFor(blocks, 'src/a.tsx');
  const ts = await rulesFor(blocks, 'src/a.ts');
  assert.deepEqual([tsx.complexity[1].max, ts.complexity[1].max], [8, 6]);
  assert.deepEqual([tsx['max-depth'], ts['max-depth']], [[2, 2], [2, 2]]);
  for (const rule of F2) assert.equal(tsx[rule]?.[0], 2, rule);
});
