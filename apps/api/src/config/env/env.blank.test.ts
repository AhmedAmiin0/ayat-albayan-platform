import { describe, expect, it } from 'vitest';
import { blankIsUnset, optionalSecret, optionalUrl } from './env.blank';

describe('env.blank: a blank KEY= is unset, never a boot failure', () => {
  it('blankIsUnset: empty and whitespace-only strings become undefined', () => {
    expect(blankIsUnset('')).toBeUndefined();
    expect(blankIsUnset('   ')).toBeUndefined();
    expect(blankIsUnset('\t\n')).toBeUndefined();
  });

  it('blankIsUnset: any other value passes through untouched', () => {
    expect(blankIsUnset(' v21.0 ')).toBe(' v21.0 ');
    expect(blankIsUnset(0)).toBe(0);
    expect(blankIsUnset(undefined)).toBeUndefined();
  });

  it('optionalSecret: blank or missing is undefined; a value is trimmed', () => {
    expect(optionalSecret.parse('')).toBeUndefined();
    expect(optionalSecret.parse('  ')).toBeUndefined();
    expect(optionalSecret.parse(undefined)).toBeUndefined();
    expect(optionalSecret.parse('  token  ')).toBe('token');
  });

  it('optionalUrl: blank is undefined, a URL passes, anything else fails', () => {
    expect(optionalUrl.parse(' ')).toBeUndefined();
    expect(optionalUrl.parse('http://localhost:4012')).toBe('http://localhost:4012');
    expect(optionalUrl.safeParse('not a url').success).toBe(false);
  });
});
