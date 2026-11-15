import { describe, expect, it } from 'vitest';
import { afterSignIn, isSafeReturn, parseReturnSearch, returnSearchOf } from './return-to';

const LESSON = '/teacher/report/0b9f3c2e-1a2b-4c3d-8e4f-5a6b7c8d9e0f';

describe('return-to: the destination after sign-in', () => {
  it('same-origin relative paths, with their search', () => {
    expect(isSafeReturn(LESSON)).toBe(true);
    expect(isSafeReturn('/teacher/report/x?tab=files')).toBe(true);
    expect(afterSignIn('/teacher', LESSON)).toBe(LESSON);
  });

  it('open redirects are refused: the role’s home instead', () => {
    const unsafe = [
      '//evil.example',
      '//evil.example/teacher',
      '/\\evil.example',
      '/\t/evil.example',
      '/\n/evil.example',
      'https://evil.example',
      'javascript:alert(1)',
      'teacher/report/x',
      ' /teacher',
      '',
    ];
    for (const path of unsafe) {
      expect(isSafeReturn(path)).toBe(false);
      expect(afterSignIn('/teacher', path)).toBe('/teacher');
    }
  });

  it('no destination: the role’s home', () => {
    expect(afterSignIn('/admin')).toBe('/admin');
  });
});

describe('parseReturnSearch (validateSearch of /login and /account-setup)', () => {
  it('keeps a safe ?redirect=', () => {
    expect(parseReturnSearch({ redirect: LESSON })).toEqual({ redirect: LESSON });
  });

  it('drops an unsafe, missing or non-string one', () => {
    expect(parseReturnSearch({ redirect: '//evil.example' })).toEqual({});
    expect(parseReturnSearch({ redirect: 42 })).toEqual({});
    expect(parseReturnSearch({})).toEqual({});
  });

  it('returnSearchOf: what a guard carries to /login', () => {
    expect(returnSearchOf(LESSON)).toEqual({ redirect: LESSON });
    expect(returnSearchOf('//evil.example')).toEqual({});
    expect(returnSearchOf()).toEqual({});
  });
});
