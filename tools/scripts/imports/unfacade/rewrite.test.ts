import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newProject } from '../../ci-checks/move-module/rewrite.ts';
import { rewriteFacade } from './rewrite.ts';

const OWNERS = new Map([
  ['toE164', '@ab/core'],
  ['Phone', '@ab/core'],
  ['t', '@ab/i18n'],
  ['Zone', '@ab/time'],
]);

const rewrite = (text: string, owners = OWNERS): string =>
  rewriteFacade(newProject().createSourceFile('/v/a.ts', text), owners).text;

test('an owner-held name moves from @ab/shared to its owner', () => {
  assert.equal(
    rewrite("import { toE164 } from '@ab/shared';\n"),
    "import { toE164 } from '@ab/core';\n",
  );
});

test('a mixed import splits per owner and keeps the shared-own names', () => {
  assert.equal(
    rewrite("import { t, own, toE164 } from '@ab/shared';\nconst x = 1;\n"),
    [
      "import { own } from '@ab/shared';",
      "import { toE164 } from '@ab/core';",
      "import { t } from '@ab/i18n';",
      'const x = 1;',
      '',
    ].join('\n'),
  );
});

test('statement-level and inline type-only flags are kept', () => {
  assert.equal(
    rewrite("import type { Phone, Zone } from '@ab/shared';\n"),
    "import type { Phone } from '@ab/core';\nimport type { Zone } from '@ab/time';\n",
  );
  assert.equal(
    rewrite("import { type Phone, own } from '@ab/shared';\n"),
    "import { own } from '@ab/shared';\nimport type { Phone } from '@ab/core';\n",
  );
});

test('a statement whose names are all inline types becomes a type-only statement', () => {
  assert.equal(
    rewrite("import { type Phone, type Zone, own } from '@ab/shared';\n"),
    [
      "import { own } from '@ab/shared';",
      "import type { Phone } from '@ab/core';",
      "import type { Zone } from '@ab/time';",
      '',
    ].join('\n'),
  );
});

test('aliases are kept in imports and in export-from', () => {
  assert.equal(
    rewrite(
      "import { toE164 as e164 } from '@ab/shared';\nexport { t as tr } from '@ab/shared';\n",
    ),
    "import { toE164 as e164 } from '@ab/core';\nexport { t as tr } from '@ab/i18n';\n",
  );
});

test("a moved name joins the file's own import of its owner", () => {
  const text = "import { a } from '@ab/core';\nimport { toE164, own } from '@ab/shared';\n";
  assert.equal(
    rewrite(text),
    "import { a, toE164 } from '@ab/core';\nimport { own } from '@ab/shared';\n",
  );
  const whole = "import { a } from '@ab/core';\nimport { toE164 } from '@ab/shared';\nf();\n";
  assert.equal(rewrite(whole), "import { a, toE164 } from '@ab/core';\nf();\n");
});

test('a statement over 100 characters wraps one name per line', () => {
  const names = [
    'toE164',
    'longNameNumberOne',
    'longNameNumberTwo',
    'longNameNumberThree',
    'fourthName',
  ];
  const owners = new Map(names.map((n) => [n, '@ab/core']));
  const text = `import { ${names.join(', ')}, other } from '@ab/shared';\n`;
  assert.equal(
    rewrite(text, owners),
    `import { other } from '@ab/shared';\nimport {\n${names.map((n) => `  ${n},`).join('\n')}\n} from '@ab/core';\n`,
  );
});

test("'@ab/shared/testing', json paths and unowned names are untouched", () => {
  const text = [
    "import { toE164 } from '@ab/shared/testing';",
    "import ar from '@ab/shared/i18n/ar.json';",
    "import { own } from '@ab/shared';",
    '',
  ].join('\n');
  const out = rewriteFacade(newProject().createSourceFile('/v/b.ts', text), OWNERS);
  assert.deepEqual(out, { text, owners: [] });
});

test('only names of the chosen owner move', () => {
  const owners = new Map([...OWNERS].filter(([, o]) => o === '@ab/i18n'));
  assert.equal(
    rewrite("import { t, toE164 } from '@ab/shared';\n", owners),
    "import { toE164 } from '@ab/shared';\nimport { t } from '@ab/i18n';\n",
  );
});
