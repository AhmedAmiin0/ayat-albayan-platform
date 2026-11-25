import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineRoute } from '../define-route';
import { routePath } from '../route-path';

const ok = z.object({ ok: z.boolean() });
const resend = defineRoute({
  method: 'POST',
  path: '/links/:code/users/:userId/resend',
  params: z.object({ code: z.string(), userId: z.string() }),
  response: ok,
});
const list = defineRoute({ method: 'GET', path: '/links', response: ok });

describe('routePath', () => {
  it('fills each :param', () => {
    expect(routePath(resend, { code: 'Ab12cd34', userId: 'u1' })).toBe(
      '/links/Ab12cd34/users/u1/resend',
    );
  });

  it('URI-encodes each value', () => {
    expect(routePath(resend, { code: 'a/b?c', userId: 'x y' })).toBe(
      '/links/a%2Fb%3Fc/users/x%20y/resend',
    );
  });

  it('returns a path without params as is', () => {
    expect(routePath(list)).toBe('/links');
  });

  it('throws on a missing or empty param', () => {
    const missing = [resend, { code: 'a' }];
    expect(() => Reflect.apply(routePath, undefined, missing)).toThrow(
      'routePath /links/:code/users/:userId/resend: missing [userId] extra []',
    );
    expect(() => routePath(resend, { code: '', userId: 'u' })).toThrow('missing [code]');
  });

  it('throws on an extra param', () => {
    const extra = [resend, { code: 'a', userId: 'u', page: 2 }];
    expect(() => Reflect.apply(routePath, undefined, extra)).toThrow('missing [] extra [page]');
  });
});
