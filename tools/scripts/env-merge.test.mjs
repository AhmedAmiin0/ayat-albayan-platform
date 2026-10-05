import assert from 'node:assert/strict';
import { test } from 'node:test';
import { changedKeys, keyOf, mergeEnv, overridesFrom } from './env-merge.mjs';

test('keyOf reads KEY=value lines only', () => {
  assert.equal(keyOf('WA_WABA_ID=123'), 'WA_WABA_ID');
  assert.equal(keyOf('# WA_WABA_ID=123'), null);
  assert.equal(keyOf(''), null);
  assert.equal(keyOf('=x'), null);
  assert.equal(keyOf('lower=x'), null);
});

test('overridesFrom skips unset and empty keys and refuses line breaks', () => {
  const o = overridesFrom(['A', 'B', 'C'], { A: '1', B: '' });
  assert.deepEqual([...o], [['A', '1']]);
  assert.throws(() => overridesFrom(['A'], { A: 'x\ny' }), /line break/);
  assert.throws(() => overridesFrom(['bad-key'], {}), /bad key/);
});

test('mergeEnv replaces in place, keeps comments and untouched keys, appends new ones', () => {
  const current = '# staging\nSUPABASE_URL=https://x\nWA_WABA_ID=old\n\nMESSAGING_ENABLED=true\n';
  const out = mergeEnv(current, new Map([['WA_WABA_ID', '1302'], ['MESSAGING_ENABLED', 'false'], ['LIVEKIT_URL', 'wss://lk']]));
  assert.equal(out, '# staging\nSUPABASE_URL=https://x\nWA_WABA_ID=1302\n\nMESSAGING_ENABLED=false\nLIVEKIT_URL=wss://lk\n');
});

test('mergeEnv keeps a value with = signs whole and drops a duplicate of an overridden key', () => {
  const out = mergeEnv('T=a\nT=b\nX=1\r\n', new Map([['T', 'abc==']]));
  assert.equal(out, 'T=abc==\nX=1\n');
});

test('mergeEnv on an empty file writes only the overrides; nothing set changes nothing', () => {
  assert.equal(mergeEnv('', new Map([['A', '1']])), 'A=1\n');
  assert.equal(mergeEnv('A=1\n', new Map()), 'A=1\n');
});

test('changedKeys lists names, never values', () => {
  assert.deepEqual(changedKeys(new Map([['B', 'secret'], ['A', 'x']])), ['A', 'B']);
});
