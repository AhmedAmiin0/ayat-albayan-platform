import { describe, expect, it } from 'vitest';
import { textDir } from './text-dir.js';

describe('textDir', () => {
  it('Arabic, Hebrew, Syriac and Thaana first letters are rtl', () => {
    expect(textDir('السلام عليكم')).toBe('rtl');
    expect(textDir('שלום')).toBe('rtl');
    expect(textDir('ܫܠܡܐ')).toBe('rtl');
    expect(textDir('ދިވެހި')).toBe('rtl');
    expect(textDir('ﻻ')).toBe('rtl'); // a presentation form
    expect(textDir('𞤀𞤣𞤤𞤢𞤥')).toBe('rtl'); // Adlam, above U+FFFF
  });

  it('Latin and other letters are ltr', () => {
    expect(textDir('Hello')).toBe('ltr');
    expect(textDir('Привет')).toBe('ltr');
  });

  it('the first strong letter decides, after digits, spaces and punctuation', () => {
    expect(textDir('123 - مرحبا Hello')).toBe('rtl');
    expect(textDir('  (12) Hello مرحبا')).toBe('ltr');
  });

  it('RLM and LRM are strong marks', () => {
    expect(textDir('\u200F123 Hello')).toBe('rtl');
    expect(textDir('\u200E123 مرحبا')).toBe('ltr');
  });

  it('digits only, punctuation only or empty: no direction', () => {
    expect(textDir('+966 55 214 7730')).toBeNull();
    expect(textDir('...')).toBeNull();
    expect(textDir('١٢٣ ، ٤')).toBeNull(); // Arabic-Indic digits and comma are weak
    expect(textDir('')).toBeNull();
  });

  it('an isolated prefix is skipped (ltr()/isolate() marks)', () => {
    expect(textDir('\u2066AB-0183\u2069 حلقة')).toBe('rtl');
    expect(textDir('\u2068Ahmed\u2069 Hello')).toBe('ltr');
    expect(textDir('\u2068أحمد\u2069 Hello')).toBe('ltr');
    expect(textDir('\u2068unclosed')).toBeNull();
  });
});
