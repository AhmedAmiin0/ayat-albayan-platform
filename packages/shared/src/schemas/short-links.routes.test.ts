import { routePath } from '@ab/core';
import { describe, expect, it } from 'vitest';
import { shortLinkRoutes } from './short-links.routes';

describe('shortLinkRoutes', () => {
  it('names the managed routes the api serves today (routes.snap.txt)', () => {
    const served = Object.values(shortLinkRoutes).map((r) => `${r.method} ${r.path}`);
    expect(served.sort()).toEqual([
      'GET /short-links',
      'GET /short-links/:code',
      'GET /short-links/people',
      'PATCH /short-links/:code',
      'POST /short-links',
      'POST /short-links/:code/resend',
      'POST /short-links/:code/revoke',
    ]);
  });

  it('fills a code into the detail path', () => {
    expect(routePath(shortLinkRoutes.detail, { code: 'K7q2M9xT' })).toBe('/short-links/K7q2M9xT');
  });

  it('refuses a code the server never makes, like the api does', () => {
    expect(shortLinkRoutes.detail.params.safeParse({ code: 'no' }).success).toBe(false);
  });

  it('parses a list answer with the page schema', () => {
    const page = { rows: [], total: 0, extra: true };
    expect(shortLinkRoutes.list.response.parse(page)).toEqual({ rows: [], total: 0 });
  });
});
