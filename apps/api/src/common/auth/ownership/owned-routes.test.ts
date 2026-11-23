import { describe, expect, it } from 'vitest';
import { compareBaseline, ownedRoutes } from './owned-routes.test-util';

const route = (r: string, permission: unknown, signedIn = false) => ({
  key: 'X.y',
  route: r,
  isPublic: false,
  signedIn,
  permission,
});

describe('ownedRoutes', () => {
  it('keeps id routes whose permission a family, teacher or sales login holds', () => {
    const routes = [
      route('GET /portal/students/:id/lessons', 'self.portal'),
      route('GET /teacher/lessons/:id', 'self.teacher'),
      route('POST /sales/subscriptions/:id/cancel', 'self.sales_money'),
    ];
    expect(ownedRoutes(routes)).toEqual(routes.map((r) => r.route).sort());
  });

  it('drops routes without a param, admin-only and assistant-only permissions, and public ones', () => {
    const routes = [
      route('GET /portal/me', 'self.portal'),
      route('DELETE /roles/:id', 'roles.manage'),
      { ...route('GET /r/:code', undefined), isPublic: true },
    ];
    expect(ownedRoutes(routes)).toEqual([]);
  });

  it('keeps signed-in id routes: every role reaches them', () => {
    expect(ownedRoutes([route('GET /reports/:id/page', undefined, true)])).toEqual([
      'GET /reports/:id/page',
    ]);
  });

  it('lists a route once when two handlers share it', () => {
    const r = route('GET /teacher/lessons/:id', 'self.teacher');
    expect(ownedRoutes([r, r])).toEqual(['GET /teacher/lessons/:id']);
  });
});

describe('compareBaseline', () => {
  const baseline = { 'GET /a/:id': 'unchecked', 'GET /b/:id': 'apps/api/src/b.test.ts' } as const;

  it('is clean when the walked routes and the baseline match', () => {
    expect(compareBaseline(['GET /a/:id', 'GET /b/:id'], baseline)).toEqual({ added: [], stale: [] });
  });

  it('names a new route and a route that is gone', () => {
    expect(compareBaseline(['GET /a/:id', 'GET /c/:id'], baseline)).toEqual({
      added: ['GET /c/:id'],
      stale: ['GET /b/:id'],
    });
  });
});
