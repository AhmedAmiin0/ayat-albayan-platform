import { describe, expect, it } from 'vitest';
import { pushTokenSchema } from './push-tokens.schemas';

const A = 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]';

describe('push token format (R-MOB-01)', () => {
  it.each([A, 'ExpoPushToken[xxxx-yyyy_zz]'])('accepts %s', (token) => {
    expect(pushTokenSchema.safeParse(token).success).toBe(true);
  });

  it.each([
    '',
    'abc',
    'ExponentPushToken[]',
    'ExponentPushToken[a b]',
    `${A} `,
    'fcm:ExponentPushToken[a]',
  ])('rejects %j', (token) => {
    expect(pushTokenSchema.safeParse(token).success).toBe(false);
  });
});
