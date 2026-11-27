import { beforeAll, describe, expect, it } from 'vitest';
import { compareRouteMap, ownedRoutes, scopedPermissions } from './owned-routes.test-util';

const route = (r: string, permission: unknown, signedIn = false) => ({
  key: 'X.y',
  route: r,
  isPublic: false,
  routePublic: false,
  ownPublic: false,
  signedIn,
  permission,
  handlerPermission: permission,
  classPermission: undefined,
  routePermissions: undefined,
  tags: ['x'],
  inDocument: true,
});

describe('ownedRoutes', () => {
  let held: ReadonlySet<unknown>;
  beforeAll(async () => {
    held = await scopedPermissions();
  });

  it('keeps id routes whose permission a family, teacher or sales login holds', () => {
    const routes = [
      route('GET /portal/students/:id/lessons', 'self.portal'),
      route('GET /teacher/lessons/:id', 'self.teacher'),
      route('POST /sales/subscriptions/:id/cancel', 'self.sales_money'),
    ];
    expect(ownedRoutes(routes, held)).toEqual(routes.map((r) => r.route).sort());
  });

  it('drops routes without a param, admin-only and assistant-only permissions, and public ones', () => {
    const routes = [
      route('GET /portal/me', 'self.portal'),
      route('DELETE /roles/:id', 'roles.manage'),
      { ...route('GET /r/:code', undefined), isPublic: true },
    ];
    expect(ownedRoutes(routes, held)).toEqual([]);
  });

  it('keeps signed-in id routes: every role reaches them', () => {
    expect(ownedRoutes([route('GET /reports/:id/page', undefined, true)], held)).toEqual([
      'GET /reports/:id/page',
    ]);
  });

  it('keeps an id route when a scoped login holds any one key of its list', () => {
    const r = route('GET /teacher/lessons/:id', ['roles.manage', 'self.teacher']);
    expect(ownedRoutes([r], held)).toEqual(['GET /teacher/lessons/:id']);
  });

  it('drops an id route whose list holds no key of a scoped login', () => {
    const r = route('DELETE /roles/:id', ['roles.manage', 'settings.write']);
    expect(ownedRoutes([r], held)).toEqual([]);
  });

  it('lists a route once when two handlers share it', () => {
    const r = route('GET /teacher/lessons/:id', 'self.teacher');
    expect(ownedRoutes([r, r], held)).toEqual(['GET /teacher/lessons/:id']);
  });
});

describe('compareRouteMap', () => {
  const map = { 'GET /a/:id': 'apps/api/src/a.test.ts', 'GET /b/:id': 'apps/api/src/b.test.ts' };

  it('is clean when the walked routes and the map match', () => {
    expect(compareRouteMap(['GET /a/:id', 'GET /b/:id'], map)).toEqual({ unmapped: [], stale: [] });
  });

  it('names an unmapped route and a route that is gone', () => {
    expect(compareRouteMap(['GET /a/:id', 'GET /c/:id'], map)).toEqual({
      unmapped: ['GET /c/:id'],
      stale: ['GET /b/:id'],
    });
  });
});
