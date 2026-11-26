import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Project } from 'ts-morph';
import { rewriteKitImports } from './rewrite.mjs';

const project = new Project({ useInMemoryFileSystem: true, skipFileDependencyResolution: true });
const TABLE = {
  moves: { '@k/testing/query': '@k/testing', '@k/a/b': '@k', '@k/a/c': '@k' },
  namespaces: { '@k/lib/api': { spec: '@k/testing', name: 'HttpApi' } },
  deep: [
    { prefix: '@w/', root: '@w', entries: { '@w/room': ['@w/x/Room'], '@w/testing': ['@w/f'] } },
  ],
  renames: { '@w/p/Panel': { Panel: 'PortalPanel' } },
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
    lines(
      "import { a, b, type B } from '@k';",
      "import type { C } from '@k';",
      "import { d } from '@k/other';",
    ),
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

test('a value namespace or a default import of a moved path is left for a person', () => {
  const text = lines("import * as B from '@k/a/b';", "import C from '@k/a/c';");
  const out = rewrite(text);
  assert.equal(out.text, text);
  assert.deepEqual(out.manual, [
    "apps/x/src/a.ts: import * as B from '@k/a/b';",
    "apps/x/src/a.ts: import C from '@k/a/c';",
  ]);
});

test('import() of a moved path loads its entry, which re-exports the same module', () => {
  const out = rewrite(lines("const { b } = await import('@k/a/b');", "await import('@w/x/y');"));
  assert.equal(out.text, lines("const { b } = await import('@k');", "await import('@w');"));
  assert.equal(out.rewritten, 2);
});

test('a deep path of a prefix kit goes to the entry that lists it, else to the root', () => {
  const out = rewrite(
    lines(
      "import { a } from '@w/lib/a';",
      "import { R } from '@w/x/Room';",
      "import { f } from '@w/f';",
      "import { g } from '@w';",
      "import { h } from '@w/room';",
      "import { i } from '@w/testing';",
    ),
  );
  assert.equal(
    out.text,
    lines(
      "import { a, g } from '@w';",
      "import { R, h } from '@w/room';",
      "import { f, i } from '@w/testing';",
    ),
  );
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

test('a name the entry exports under another name keeps its local name', () => {
  const out = rewrite(
    lines(
      "import { Panel, type PanelProps } from '@w/p/Panel';",
      "export { Panel } from '@w/p/Panel';",
    ),
  );
  assert.equal(
    out.text,
    lines(
      "import { PortalPanel as Panel, type PanelProps } from '@w';",
      "export { PortalPanel as Panel } from '@w';",
    ),
  );
});
