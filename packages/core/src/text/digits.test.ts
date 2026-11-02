import { describe, expect, it } from 'vitest';
import { asciiDigits } from './digits.js';

describe('asciiDigits', () => {
  it('folds Arabic-Indic digits', () => {
    expect(asciiDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
  });

  it('folds Persian digits', () => {
    expect(asciiDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
  });

  it('keeps every other character, spaces and separators included', () => {
    expect(asciiDigits(' +٩٦٦ 5x٫,۱ ')).toBe(' +966 5x٫,1 ');
  });

  it('leaves Western digits and empty text as they are', () => {
    expect(asciiDigits('2026')).toBe('2026');
    expect(asciiDigits('')).toBe('');
  });
});
