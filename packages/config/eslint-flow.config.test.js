// docs/36 F-2/F-3 (D4): the flow limits reach every package's composed Oxlint config.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reactRestrictions } from './eslint-react.js';
import { packageOverrides } from './oxlint/config.js';
import { rulesFor } from './oxlint/resolve.js';

const F2 = ['no-nested-ternary', 'no-lonely-if', 'no-else-return'];
const rulesOf = ({ react = false, blocks = [] }, file) =>
  rulesFor({ rules: {}, ...packageOverrides({ dir: 'pkg', react, blocks }) }, `pkg/${file}`);

test('a package: complexity 6 on .ts, 8 on .js, classic variant; depth 2; the F-2 rules are errors', () => {
  const ts = rulesOf({}, 'src/a.ts');
  assert.deepEqual(ts.complexity, ['error', { max: 6, variant: 'classic' }]);
  assert.deepEqual(ts['max-depth'], ['error', 2]);
  for (const rule of F2) assert.equal([ts[rule]].flat()[0], 'error', rule);
  const js = rulesOf({}, 'src/a.js');
  assert.deepEqual(js.complexity, ['error', { max: 8, variant: 'classic' }]);
});

test('a React package: .tsx keeps complexity 8, .ts gets 6, depth 2 on both', () => {
  const files = ['src/**/*.{ts,tsx}'];
  const blocks = reactRestrictions({ files, effects: ['src/**/*.tsx'], compiler: true, react19: true });
  const [tsx, ts] = ['src/a.tsx', 'src/a.ts'].map((file) => rulesOf({ react: true, blocks }, file));
  assert.deepEqual([tsx.complexity[1].max, ts.complexity[1].max], [8, 6]);
  assert.deepEqual([tsx['max-depth'], ts['max-depth']], [['error', 2], ['error', 2]]);
  for (const rule of F2) assert.equal([tsx[rule]].flat()[0], 'error', rule);
});
