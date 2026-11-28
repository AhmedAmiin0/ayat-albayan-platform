import { routePath } from '@ab/core';
import { describe, expect, it } from 'vitest';
import { pushTokenRoutes } from './push-tokens.routes';

const TOKEN = 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]';
const KEY = 'k'.repeat(43);

describe('pushTokenRoutes (R-MOB-01)', () => {
  it('keeps the paths the api serves today', () => {
    const { add, remove } = pushTokenRoutes;
    expect(`${add.method} ${add.path}`).toBe('PUT /me/push-tokens');
    expect(`${remove.method} ${remove.path}`).toBe('DELETE /me/push-tokens/:token');
  });

  it('encodes the token brackets in the delete path', () => {
    const path = routePath(pushTokenRoutes.remove, { token: TOKEN });
    expect(path).toBe(`/me/push-tokens/${encodeURIComponent(TOKEN)}`);
  });

  it('takes a token with or without the kept device key', () => {
    const { body } = pushTokenRoutes.add;
    expect(body.parse({ token: TOKEN })).toEqual({ token: TOKEN });
    expect(body.parse({ token: TOKEN, deviceKey: KEY })).toEqual({ token: TOKEN, deviceKey: KEY });
  });

  it.each([
    ['a raw fcm token', { token: 'fcm-raw-token' }],
    ['a short device key', { token: TOKEN, deviceKey: 'short' }],
  ])('refuses %s', (_name, body) => {
    expect(pushTokenRoutes.add.body.safeParse(body).success).toBe(false);
  });

  it('answers the device key to keep, nothing else', () => {
    const { response } = pushTokenRoutes.add;
    expect(response.parse({ deviceKey: KEY })).toEqual({ deviceKey: KEY });
    expect(response.safeParse({}).success).toBe(false);
    expect(pushTokenRoutes.remove.response).toBe('empty');
  });
});
