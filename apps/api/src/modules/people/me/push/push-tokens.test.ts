import { describe, expect, it } from 'vitest';
import { MAX_PUSH_TOKENS, pushTokenSchema, withoutPushToken, withPushToken } from './push-tokens';

const A = 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]';
const B = 'ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]';

describe('push token format (R-MOB-01)', () => {
  it.each([A, 'ExpoPushToken[xxxx-yyyy_zz]'])('accepts %s', (token) => {
    expect(pushTokenSchema.safeParse(token).success).toBe(true);
  });

  it.each(['', 'abc', 'ExponentPushToken[]', 'ExponentPushToken[a b]', `${A} `, 'fcm:ExponentPushToken[a]'])(
    'rejects %j',
    (token) => {
      expect(pushTokenSchema.safeParse(token).success).toBe(false);
    },
  );
});

describe('withPushToken / withoutPushToken (R-MOB-01)', () => {
  it('adds once: a known token returns the same array (no write)', () => {
    const one = withPushToken([], A);
    expect(one).toEqual([A]);
    expect(withPushToken(one, A)).toBe(one);
    expect(withPushToken(one, B)).toEqual([A, B]);
  });

  it('keeps only the newest MAX tokens', () => {
    const full = Array.from({ length: MAX_PUSH_TOKENS }, (_, i) => `ExponentPushToken[t${i}]`);
    const next = withPushToken(full, B);
    expect(next).toHaveLength(MAX_PUSH_TOKENS);
    expect(next[0]).toBe('ExponentPushToken[t1]');
    expect(next.at(-1)).toBe(B);
  });

  it('removes the token; an unknown token returns the same array (no write)', () => {
    const both = [A, B];
    expect(withoutPushToken(both, A)).toEqual([B]);
    expect(withoutPushToken(both, 'ExponentPushToken[zz]')).toBe(both);
  });
});
