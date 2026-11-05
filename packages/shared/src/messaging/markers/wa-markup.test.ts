import { describe, expect, it } from 'vitest';
import { parseWaMarkup, stripWaMarkup } from './wa-markup.js';

const P = { bold: false, italic: false, strike: false, mono: false };

describe('parseWaMarkup', () => {
  it('reads each marker', () => {
    expect(parseWaMarkup('*b*')).toEqual([{ ...P, bold: true, text: 'b' }]);
    expect(parseWaMarkup('_i_')).toEqual([{ ...P, italic: true, text: 'i' }]);
    expect(parseWaMarkup('~s~')).toEqual([{ ...P, strike: true, text: 's' }]);
    expect(parseWaMarkup('```m *x*```')).toEqual([{ ...P, mono: true, text: 'm *x*' }]);
  });

  it('keeps the plain text around a mark', () => {
    expect(parseWaMarkup('hi *there* you')).toEqual([
      { ...P, text: 'hi ' },
      { ...P, bold: true, text: 'there' },
      { ...P, text: ' you' },
    ]);
  });

  it('combines nested marks', () => {
    expect(parseWaMarkup('*_both_ bold*')).toEqual([
      { ...P, bold: true, italic: true, text: 'both' },
      { ...P, bold: true, text: ' bold' },
    ]);
  });

  it('leaves unclosed or spaced markers as typed', () => {
    expect(parseWaMarkup('*open')).toEqual([{ ...P, text: '*open' }]);
    expect(parseWaMarkup('* spaced *')).toEqual([{ ...P, text: '* spaced *' }]);
    expect(parseWaMarkup('snake_case_name 2*3*4')).toEqual([
      { ...P, text: 'snake_case_name 2*3*4' },
    ]);
  });

  it('reads Arabic text', () => {
    expect(parseWaMarkup('مرحبًا *أكاديمية آيات البيان*')).toEqual([
      { ...P, text: 'مرحبًا ' },
      { ...P, bold: true, text: 'أكاديمية آيات البيان' },
    ]);
  });

  it('gives nothing for an empty text', () => {
    expect(parseWaMarkup('')).toEqual([]);
  });
});

describe('stripWaMarkup', () => {
  it('drops the markers, keeps the words', () => {
    expect(stripWaMarkup('أنت: *أكاديمية* _آيات_ ~البيان~')).toBe('أنت: أكاديمية آيات البيان');
    expect(stripWaMarkup('price 5*2 = 10')).toBe('price 5*2 = 10');
  });
});
