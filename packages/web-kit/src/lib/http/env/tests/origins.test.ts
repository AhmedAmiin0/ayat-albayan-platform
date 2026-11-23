import { describe, expect, it } from 'vitest';
import { env, optionalOrigin } from '@ab/web-kit/lib/http/env/env';

describe('optionalOrigin: the other web app (docs/51 §3)', () => {
  it('unset, blank or not an http(s) URL → "" (no link, no redirect)', () => {
    for (const raw of [undefined, '', '  ', 'family.example.test', 'ftp://family.example.test']) {
      expect(optionalOrigin(raw)).toBe('');
    }
  });

  it('an http(s) URL → its origin, trimmed, no trailing slash or path', () => {
    expect(optionalOrigin(' https://family.example.test/ ')).toBe('https://family.example.test');
    expect(optionalOrigin('http://localhost:5181/portal')).toBe('http://localhost:5181');
  });

  it('the unit-test build sets neither', () => {
    expect([env.familyOrigin, env.staffOrigin]).toEqual(['', '']);
  });
});
