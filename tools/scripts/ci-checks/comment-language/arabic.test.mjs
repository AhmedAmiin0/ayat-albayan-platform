import assert from 'node:assert/strict';
import { test } from 'node:test';
import { arabicCommentsOf, hashArabicLinesOf } from './arabic.mjs';

const AR = 'حلقة';

test('finds Arabic in line, block, JSDoc and JSX comments with their line', () => {
  const text = [`// ${AR}`, `/* ${AR} */`, `/**\n * x ${AR}\n */`, `const a = <p>{/* ${AR} */}</p>;`];
  const found = arabicCommentsOf(`${text.join('\n')}\n`, 'A.tsx');
  assert.deepEqual(
    found.map((f) => f.line),
    [1, 2, 3, 6],
  );
});

test('a trailing comment on a code line counts', () => {
  assert.deepEqual(arabicCommentsOf(`const a = 1; // ${AR}\n`, 'a.ts').map((f) => f.line), [1]);
});

const notComments = {
  string: [`const a = '// ${AR}';\n`, 'a.ts'],
  template: [`const a = \`/* ${AR} */\`;\n`, 'a.ts'],
  jsxText: [`const a = <p>${AR} // ${AR}</p>;\n`, 'A.tsx'],
  testName: [`test('${AR}', () => {});\n`, 'a.test.ts'],
  englishComment: ['// lesson «report»\n', 'a.ts'],
};
for (const [name, [text, file]] of Object.entries(notComments)) {
  test(`ignores Arabic outside comments: ${name}`, () => {
    assert.deepEqual(arabicCommentsOf(text, file), []);
  });
}

test('covers every Arabic block the owner listed', () => {
  const letters = ['ا', 'ݐ', 'ࢠ', 'ﭐ', 'ﷻ', 'ﹰ', 'ﻼ'];
  letters.forEach((l) => assert.equal(arabicCommentsOf(`// ${l}\n`, 'a.ts').length, 1, l));
});

test('finds Arabic after # in YAML and shell, not in a value', () => {
  const text = `a: 1 # ${AR}\n# ${AR}\nname: "${AR}"\nurl: x#${AR}\n`;
  assert.deepEqual(
    hashArabicLinesOf(text).map((f) => f.line),
    [1, 2],
  );
});
