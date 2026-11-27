import { describe, expect, it } from 'vitest';
import { shortLinkRedirectRoutes as routes } from './short-links.routes';

describe('shortLinkRedirectRoutes', () => {
  it('keeps the public redirect path the links are printed with', () => {
    const { go } = routes;
    expect(`${go.method} ${go.path}`).toBe('GET /r/:code');
    expect(go.response).toBe('redirect');
    expect(go).not.toHaveProperty('permissions');
    expect(go.tags).toEqual(['short-links']);
  });

  it('reads any code as text, so a code that cannot be ours still gets the same 404 page', () => {
    expect(routes.go.params.parse({ code: '../x' })).toEqual({ code: '../x' });
  });
});
