import { describe, expect, it } from 'vitest';
import { CodedError, errorCode, errorMessage, errorTextOf } from './errors.js';

describe('error helpers', () => {
  it('errorMessage reads an Error, else stringifies', () => {
    expect(errorMessage(new Error('bad'))).toBe('bad');
    expect(errorMessage('plain')).toBe('plain');
    expect(errorMessage(42)).toBe('42');
  });

  it('errorTextOf cuts to 500 chars by default, or to max', () => {
    expect(errorTextOf(new Error('x'.repeat(900)))).toHaveLength(500);
    expect(errorTextOf('abcdef', 3)).toBe('abc');
  });

  it('CodedError keeps its code; the message defaults to it', () => {
    const e = new CodedError('lesson_conflict');
    expect(e).toBeInstanceOf(Error);
    expect([e.code, e.message, e.name]).toEqual(['lesson_conflict', 'lesson_conflict', 'CodedError']);
    expect(new CodedError('x', 'readable').message).toBe('readable');
  });

  it('errorCode reads a string code, else null', () => {
    expect(errorCode(new CodedError('a'))).toBe('a');
    expect(errorCode({ code: 'b' })).toBe('b');
    expect(errorCode({ code: 7 })).toBeNull();
    expect(errorCode(new Error('no code'))).toBeNull();
    expect(errorCode(null)).toBeNull();
    expect(errorCode('str')).toBeNull();
  });
});
