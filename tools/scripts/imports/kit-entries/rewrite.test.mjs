import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Project } from 'ts-morph';
import { rewriteKitImports } from './rewrite.mjs';

const project = new Project({ useInMemoryFileSystem: true, skipFileDependencyResolution: true });
const TABLE = {
  moves: { '@k/testing/query': '@k/testing', '@k/a/b': '@k', '@k/a/c': '@k' },
  namespaces: { '@k/lib/api': { spec: '@k/testing', name: 'HttpApi' } },
};
const rewrite = (text) => rewriteKitImports(project, { file: 'apps/x/src/a.ts', text }, TABLE);
const lines = (...l) => `${l.join('\n')}\n`;

test('a named import of a moved path names its new entry', () => {
  const out = rewrite(lines("import { render } from '@k/testing/query';", 'render();'));
  assert.equal(out.text, lines("import { render } from '@k/testing';", 'render();'));
  assert.equal(out.rewritten, 1);
});

test('imports that land on one entry merge into the first, value and type kept apart', () => {
  const out = rewrite(
    lines(
      "import { a } from '@k';",
      "import { b, type B } from '@k/a/b';",
      "import type { C } from '@k/a/c';",
      "import { d } from '@k/other';",
    ),
  );
  assert.equal(
    out.text,
    lines("import { a, b, type B } from '@k';", "import type { C } from '@k';", "import { d } from '@k/other';"),
  );
});

test('re-exports and type re-exports move the same way', () => {
  const out = rewrite(lines("export { b } from '@k/a/b';", "export type { C } from '@k/a/c';"));
  assert.equal(out.text, lines("export { b } from '@k';", "export type { C } from '@k';"));
});

test('a type namespace of a mocked module becomes its named namespace in the test entry', () => {
  const out = rewrite(
    lines(
      "import type * as HttpApi from '@k/lib/api';",
      "import type * as Api from '@k/lib/api';",
      "import { render } from '@k/testing/query';",
    ),
  );
  assert.equal(
    out.text,
    lines(
      "import type { HttpApi, HttpApi as Api } from '@k/testing';",
      "import { render } from '@k/testing';",
    ),
  );
});

test('mock paths, other packages and relative paths stay as they are', () => {
  const text = lines(
    "jest.mock('@k/a/b', () => jest.requireActual('@k/a/b'));",
    "vi.mock('@k/a/c');",
    "import { z } from './a/b';",
    "import { y } from '@k-x/a/b';",
  );
  assert.deepEqual(rewrite(text), { text, rewritten: 0, manual: [] });
});

test('a value namespace, a default import or import() of a moved path is left for a person', () => {
  const text = lines(
    "import * as B from '@k/a/b';",
    "import C from '@k/a/c';",
    "const d = import('@k/a/b');",
  );
  const out = rewrite(text);
  assert.equal(out.text, text);
  assert.deepEqual(out.manual, [
    "apps/x/src/a.ts: import * as B from '@k/a/b';",
    "apps/x/src/a.ts: import C from '@k/a/c';",
    "apps/x/src/a.ts: import('@k/a/b')",
  ]);
});

test('a merged statement past 100 columns wraps one name per line', () => {
  const names = Array.from({ length: 12 }, (_, i) => `name${String(i)}`);
  const out = rewrite(lines(`import { ${names.join(', ')} } from '@k/a/b';`));
  assert.equal(out.text, lines('import {', ...names.map((n) => `  ${n},`), "} from '@k';"));
});

test('a second run changes nothing', () => {
  const once = rewrite(lines("import { b } from '@k/a/b';", "import { c } from '@k/a/c';")).text;
  assert.deepEqual(rewrite(once), { text: once, rewritten: 0, manual: [] });
});
