import { describe, expect, it } from 'vitest';
import { lessonLinkRoutes as routes } from './lesson-links.routes';

describe('lessonLinkRoutes', () => {
  it('keeps the paths of today, public redirects under the lesson-links tag', () => {
    const lines = Object.values(routes).map((r) => [r.method, r.path, r.response, r.tags]);
    expect(lines).toEqual([
      ['GET', '/join/:token', 'redirect', ['lesson-links']],
      ['GET', '/report-link/legacy/*', 'redirect', ['lesson-links']],
    ]);
    for (const route of Object.values(routes)) expect(route).not.toHaveProperty('permissions');
  });

  it('takes any join token text up to 100 characters', () => {
    expect(routes.join.params.parse({ token: 'not-ours' })).toEqual({ token: 'not-ours' });
    expect(routes.join.params.safeParse({ token: 'x'.repeat(101) }).success).toBe(false);
  });
});
