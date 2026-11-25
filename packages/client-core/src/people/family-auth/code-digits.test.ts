import { expect, test } from 'vitest';
import { CODE_LENGTH, codeDigits, isWholeCode } from './code-digits';

test('typed, pasted with spaces or words, or in Arabic digits → six ASCII digits', () => {
  expect(codeDigits('12')).toBe('12');
  expect(codeDigits('123 456')).toBe('123456');
  expect(codeDigits('رمز الدخول: ١٢٣٤٥٦')).toBe('123456');
  expect(codeDigits('1234567890')).toBe('123456');
  expect(codeDigits('abc')).toBe('');
});

test('whole only at six digits', () => {
  expect(CODE_LENGTH).toBe(6);
  expect(isWholeCode('12345')).toBe(false);
  expect(isWholeCode('123456')).toBe(true);
});
