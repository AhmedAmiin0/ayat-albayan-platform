import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pathRefs } from './refs.ts';

const TEXTS: Record<string, string> = {
  'packages/config/package.json':
    '{ "exports": { "./eslint": "./eslint.js", "./x": "./src/x.ts" } }',
  'apps/web/vite.config.ts': "export default { test: { setupFiles: ['src/test-setup.ts'] } };",
  '.github/workflows/ci.yml': 'run: node tools/scripts/units/fold.ts',
  'tools/scripts/a.test.mjs': "const p = 'apps/web/src/lib/env.ts'; import x from './b.ts';",
  'apps/web/src/lib/a.ts': "import { b } from './b.ts';",
  'refactor/guards/knip.json': '["apps/web/src/lib/c.ts exports X"]',
  'tools/scripts/self.mjs': '// Usage: node tools/scripts/self.mjs',
};

test('pathRefs: config paths resolve from the config folder, code mentions by repo path', () => {
  const refs = pathRefs(Object.keys(TEXTS), (f) => TEXTS[f] ?? '');
  const expected: [string, string[] | undefined][] = [
    ['packages/config/eslint.js', ['packages/config/package.json']],
    ['packages/config/src/x.ts', ['packages/config/package.json']],
    ['apps/web/src/test-setup.ts', ['apps/web/vite.config.ts']],
    ['tools/scripts/units/fold.ts', ['.github/workflows/ci.yml']],
    ['apps/web/src/lib/env.ts', ['tools/scripts/a.test.mjs']],
    ['apps/web/src/lib/b.ts', undefined],
    ['tools/scripts/b.ts', undefined],
    ['apps/web/src/lib/c.ts', undefined],
    ['tools/scripts/self.mjs', undefined],
  ];
  for (const [file, by] of expected) assert.deepEqual(refs.get(file), by, file);
});

test('pathRefs: a path a file of the same workspace spells from inside its tree counts', () => {
  const texts: Record<string, string> = {
    'apps/mob/src/core/http/upload-slot.ts': '',
    'apps/mob/src/core/http/upload-slot.guard.test.ts':
      "const HELPER = 'core/http/upload-slot.ts';",
    'apps/web/src/core/http/upload-slot.ts': '',
    'apps/web/src/core/http/upload-slot.guard.test.ts':
      "const HELPER = join('core', 'http', 'upload-slot.ts');",
    'apps/mob/src/a.ts': "import { b } from './core/http/upload-slot.ts'; const n = 'x.ts';",
  };
  const refs = pathRefs(Object.keys(texts), (f) => texts[f] ?? '');
  assert.deepEqual(refs.get('apps/mob/src/core/http/upload-slot.ts'), [
    'apps/mob/src/core/http/upload-slot.guard.test.ts',
  ]);
  assert.deepEqual(refs.get('apps/web/src/core/http/upload-slot.ts'), [
    'apps/web/src/core/http/upload-slot.guard.test.ts',
  ], 'a join of literals counts too; the other workspace does not');
});
