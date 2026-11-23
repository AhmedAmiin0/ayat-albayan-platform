import assert from 'node:assert/strict';
import { test } from 'node:test';
import { maskSpecifiers } from './specifiers.mjs';

test('maskSpecifiers blanks every module path and own-folder path, nothing else', () => {
  const text = [
    "import { a } from './a';",
    "export * from '@/b';",
    "vi.mock('../c', () => ({ x: 'kept' }));",
    "const d = await import('./d');",
    "type E = import('./e').E;",
    "new URL('./f.json', import.meta.url);",
    "join(__dirname, 'g', 'h.json');",
    "require('./i');",
    "call('./j');",
  ].join('\n');
  assert.equal(
    maskSpecifiers(text, 'x.ts'),
    [
      "import { a } from '';",
      "export * from '';",
      "vi.mock('', () => ({ x: 'kept' }));",
      "const d = await import('');",
      "type E = import('').E;",
      "new URL('', import.meta.url);",
      "join(__dirname, '', '');",
      "require('');",
      "call('./j');",
    ].join('\n'),
  );
});
