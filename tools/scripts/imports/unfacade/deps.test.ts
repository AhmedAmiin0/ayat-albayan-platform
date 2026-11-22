import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withDeps } from './deps.ts';

const manifest = (body: object): string => `${JSON.stringify(body, null, 2)}\n`;

test('missing owners join dependencies, sorted, and the other keys keep their order', () => {
  const text = manifest({
    name: 'x',
    dependencies: { zod: '^4', '@ab/shared': 'workspace:*' },
    z: 1,
  });
  const out = withDeps(text, ['@ab/time', '@ab/core', '@ab/time']);
  assert.deepEqual(out.added, ['@ab/core', '@ab/time']);
  const parsed = JSON.parse(out.text);
  assert.deepEqual(Object.keys(parsed), ['name', 'dependencies', 'z']);
  assert.deepEqual(Object.keys(parsed.dependencies), ['@ab/core', '@ab/shared', '@ab/time', 'zod']);
});

test('a package already in any dependency field is not added; nothing missing keeps the text', () => {
  const text = manifest({ name: 'x', devDependencies: { '@ab/core': 'workspace:*' } });
  assert.deepEqual(withDeps(text, ['@ab/core']), { text, added: [] });
  const out = withDeps(text, ['@ab/i18n']);
  assert.deepEqual(JSON.parse(out.text).dependencies, { '@ab/i18n': 'workspace:*' });
});

test('a manifest with a malformed dependency field throws', () => {
  assert.throws(() => withDeps(manifest({ dependencies: [] }), ['@ab/core']));
});
