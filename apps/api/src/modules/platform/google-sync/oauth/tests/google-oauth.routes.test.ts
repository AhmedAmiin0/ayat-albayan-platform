import { describe, expect, it } from 'vitest';
import { googleOAuthRoutes as routes } from '@/modules/platform/google-sync/oauth/google-oauth.routes';

describe('googleOAuthRoutes', () => {
  it('keeps the callback path Google is registered with, as a public redirect', () => {
    const { callback } = routes;
    expect(`${callback.method} ${callback.path}`).toBe('GET /integrations/google/callback');
    expect(callback.response).toBe('redirect');
    expect(callback).not.toHaveProperty('permissions');
    expect(callback.isPublic).toBe(true);
  });

  it('reads the code, the state and the error Google sends back', () => {
    const sent = { code: 'c-1', state: 's-1', error: 'access_denied', scope: 'x' };
    expect(routes.callback.query.parse(sent)).toEqual({
      code: 'c-1',
      state: 's-1',
      error: 'access_denied',
    });
  });

  it('turns a repeated value into none, so the browser is still sent back to settings', () => {
    const parsed = routes.callback.query.parse({ code: ['a', 'b'], state: 's-1' });
    expect(parsed).toEqual({ code: undefined, state: 's-1', error: undefined });
  });
});
