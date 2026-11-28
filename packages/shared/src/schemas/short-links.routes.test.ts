import { routePath } from '@ab/core';
import { describe, expect, it } from 'vitest';
import { shortLinkGateRoutes, shortLinkRoutes } from './short-links.routes';

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

  it('lets short_links.manage in on every route and tags each short-links', () => {
    const access = Object.values(shortLinkRoutes).map((r) => [r.permissions, r.tags]);
    expect(new Set(access.map((a) => JSON.stringify(a)))).toEqual(
      new Set([JSON.stringify([['short_links.manage'], ['short-links']])]),
    );
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

describe('shortLinkGateRoutes', () => {
  it('names the gate routes the api serves today, tagged short-links, without a permission', () => {
    const gate = Object.values(shortLinkGateRoutes);
    expect(gate.map((r) => `${r.method} ${r.path}`).sort()).toEqual([
      'GET /public/short-links/:code',
      'POST /public/short-links/:code/open',
      'POST /public/short-links/:code/otp/start',
      'POST /public/short-links/:code/otp/verify',
    ]);
    expect(gate.map((r) => [r.tags, 'permissions' in r])).toEqual(
      gate.map(() => [['short-links'], false]),
    );
  });

  it('marks the view and the code routes public, and leaves open to a signed-in caller', () => {
    const { view, start, verify, open } = shortLinkGateRoutes;
    expect([view, start, verify].map((r) => r.isPublic)).toEqual([true, true, true]);
    expect(open).not.toHaveProperty('isPublic');
  });

  it('reads the phone and the six digits, and answers the start with nothing', () => {
    const { start, verify } = shortLinkGateRoutes;
    expect(start.body.safeParse({ phone: '0100' }).success).toBe(false);
    expect(verify.body.parse({ phone: '+201000000001', code: '123456' }).code).toBe('123456');
    expect(start.response).toBe('empty');
  });

  it('keeps the target out of every outcome but open', () => {
    const answer = shortLinkGateRoutes.open.response;
    expect(answer.parse({ outcome: 'gone', target: 'https://x.test' })).toEqual({ outcome: 'gone' });
    expect(answer.safeParse({ outcome: 'open' }).success).toBe(false);
  });
});
