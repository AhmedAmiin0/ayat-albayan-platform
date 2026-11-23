import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { entryFiles, runKit } from './kit-entries.mjs';

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'kit-entries-'));
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  return root;
}

const KIT = 'packages/web-kit';
const EXPORTS = { './form': './src/ui/form/index.ts', './testing': './src/testing/index.ts' };
const TREE = {
  [`${KIT}/package.json`]: JSON.stringify({ exports: EXPORTS }),
  [`${KIT}/src/ui/form/index.ts`]: "export { Button } from './button';\nexport * from './field';\n",
  [`${KIT}/src/ui/form/button.tsx`]: '',
  [`${KIT}/src/ui/form/field/index.ts`]: "export { Field } from './Field';\n",
  [`${KIT}/src/ui/form/field/Field.tsx`]: '',
  [`${KIT}/src/ui/form/secret.ts`]: '',
  [`${KIT}/src/testing/index.ts`]: "export { lesson } from '#/portal/portal.fixtures.ts';\n",
  [`${KIT}/src/portal/portal.fixtures.ts`]: '',
};

test('entryFiles: every file an entry re-exports, through nested index files and `#/`', () => {
  const root = fixture(TREE);
  const files = entryFiles(root);
  assert.equal(files.get(`${KIT}/src/ui/form/button.tsx`), 'form');
  assert.equal(files.get(`${KIT}/src/ui/form/field/Field.tsx`), 'form');
  assert.equal(files.get(`${KIT}/src/portal/portal.fixtures.ts`), 'testing');
  assert.equal(files.get(`${KIT}/src/ui/form/secret.ts`), undefined);
});

test('runKit: deep paths become entries, mocks too; a path no entry exports is reported', () => {
  const app = 'apps/family-web/src/a.tsx';
  const text = [
    "import { Button } from '@ab/web-kit/ui/form/button';",
    "import type { FieldProps } from '@ab/web-kit/ui/form/field';",
    "vi.mock('@ab/web-kit/portal/portal.fixtures');",
    "import { s } from '@ab/web-kit/ui/form/secret';",
    "import { Field } from '@ab/web-kit/form';",
  ].join('\n');
  const root = fixture({ ...TREE, [app]: text });
  const dry = runKit(root, { targets: ['apps/family-web'], write: false });
  assert.deepEqual(dry.rewritten, 3);
  assert.deepEqual(dry.missing, [`${app}: @ab/web-kit/ui/form/secret`]);
  assert.equal(readFileSync(join(root, app), 'utf8'), text);
  runKit(root, { targets: ['apps/family-web'], write: true });
  const out = readFileSync(join(root, app), 'utf8').split('\n');
  assert.deepEqual(out.slice(0, 3), [
    "import { Button } from '@ab/web-kit/form';",
    "import type { FieldProps } from '@ab/web-kit/form';",
    "vi.mock('@ab/web-kit/testing');",
  ]);
  assert.equal(runKit(root, { targets: ['apps/family-web'], write: false }).rewritten, 0);
});
