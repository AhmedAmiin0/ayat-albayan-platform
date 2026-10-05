import { describe, expect, it } from 'vitest';
import { arabicLiterals, stripComments } from './arabic-literals.js';

describe('arabicLiterals', () => {
  it('flags Arabic in string literals and JSX text', () => {
    const src = ["const a = 'مرحبا';", '<p>أهلا</p>', 'const b = `x ${y} سلام`;'].join('\n');
    expect(arabicLiterals(src).map((h) => h.line)).toEqual([1, 2, 3]);
  });

  it('ignores line, block and JSX comments', () => {
    const src = [
      '// «تعليق»',
      '/** «توثيق»',
      ' * سطر */',
      '{/* «ملاحظة» */}',
      "const url = 'http://x'; // بعد رابط",
    ].join('\n');
    expect(arabicLiterals(src)).toEqual([]);
  });

  it('a // inside a string is not a comment', () => {
    expect(arabicLiterals("const u = 'http://a/سلام';")).toHaveLength(1);
  });

  it('an apostrophe in JSX text does not swallow the next lines', () => {
    const src = ["<p>don't</p>", '<p>نص</p>'].join('\n');
    expect(arabicLiterals(src)).toEqual([{ line: 2, text: '<p>نص</p>' }]);
  });

  it('keeps line numbers after a block comment', () => {
    expect(stripComments('/* a\nb */x').split('\n')).toEqual(['', 'x']);
  });

  it('clean code has no hits', () => {
    expect(arabicLiterals('export const x = t.nav.leads;')).toEqual([]);
  });
});
