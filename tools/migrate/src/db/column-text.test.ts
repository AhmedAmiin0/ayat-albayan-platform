import { describe, expect, it } from 'vitest';
import { columnText } from './column-text.ts';

describe('columnText', () => {
  it('keeps strings and writes numbers and booleans as text', () => {
    expect(columnText('Ali')).toBe('Ali');
    expect(columnText(7)).toBe('7');
    expect(columnText(false)).toBe('false');
  });

  it('reads null, missing, arrays and objects as empty text', () => {
    expect(columnText(null)).toBe('');
    expect(columnText(undefined)).toBe('');
    expect(columnText(['a'])).toBe('');
    expect(columnText({ a: 1 })).toBe('');
  });
});
