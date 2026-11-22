import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareFile } from './compare.mjs';
import * as code from './fixtures/code.mjs';
import * as directives from './fixtures/directives.mjs';
import * as jsx from './fixtures/jsx.mjs';

const suites = { code, jsx, directives };

for (const [suite, cases] of Object.entries(suites)) {
  for (const { name, file, base, head } of cases.pass) {
    test(`${suite} passes: ${name}`, () => {
      assert.equal(compareFile({ file, base, head }), null);
    });
  }
  for (const { name, file, base, head } of cases.fail) {
    test(`${suite} fails: ${name}`, () => {
      assert.match(compareFile({ file, base, head }) ?? '', /\S/);
    });
  }
}

test('an unchanged file passes', () => {
  const text = '#!/usr/bin/env node\n// x\nrun();\n';
  assert.equal(compareFile({ file: 'a.mjs', base: text, head: text }), null);
});

test('a missing directive is named in the message', () => {
  const [ts] = directives.fail.filter((c) => c.name.includes('@ts-expect-error'));
  assert.match(compareFile(ts) ?? '', /@ts-expect-error the lib type is wrong/);
});

test('a code change names the first differing node path', () => {
  const message = compareFile({ file: 'a.ts', base: 'f(1);\n', head: 'f(2);\n' }) ?? '';
  assert.match(message, /CallExpression/);
  assert.match(message, /NumericLiteral:1/);
  assert.match(message, /NumericLiteral:2/);
});
