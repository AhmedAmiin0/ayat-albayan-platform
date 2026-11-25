import { describe, expect, it } from 'vitest';
import { digits, textOr } from './state.ts';

describe('wa-stub: digits and textOr', () => {
  it('keeps the digits of a string or number phone and empties anything else', () => {
    expect(digits('+966 59-891')).toBe('96659891');
    expect(digits(2010)).toBe('2010');
    expect(digits({ phone: '2010' })).toBe('');
    expect(digits(undefined)).toBe('');
  });

  it('reads a string or number as text and falls back for anything else', () => {
    expect(textOr('a', 'b')).toBe('a');
    expect(textOr(7, 'b')).toBe('7');
    expect(textOr({ a: 1 }, 'b')).toBe('b');
    expect(textOr(['a'], 'b')).toBe('b');
    expect(textOr(null, 'b')).toBe('b');
  });
});
