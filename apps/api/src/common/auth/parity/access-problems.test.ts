import { describe, expect, it } from 'vitest';
import { accessProblems } from './access-problems.test-util';
import type { RouteAccess } from './route-walk.test-util';

const LIST = ['short_links.manage'] as const;

const aRoute = (overrides: Partial<RouteAccess> = {}): RouteAccess => ({
  key: 'ProbeController.list',
  route: 'GET /probe',
  isPublic: false,
  signedIn: false,
  permission: 'students.read',
  handlerPermission: 'students.read',
  classPermission: undefined,
  routePermissions: undefined,
  tags: ['probe'],
  inDocument: true,
  ...overrides,
});
const fromList = (overrides: Partial<RouteAccess> = {}): RouteAccess =>
  aRoute({ permission: LIST, handlerPermission: LIST, routePermissions: LIST, ...overrides });

describe('accessProblems', () => {
  it('accepts a handler key, a class key and a route object list on their own', () => {
    const fromClass = aRoute({ handlerPermission: undefined, classPermission: 'students.read' });
    expect([aRoute(), fromClass, fromList()].flatMap(accessProblems)).toEqual([]);
  });

  it('accepts a route list whose keys all belong to the catalog', () => {
    const two = ['short_links.manage', 'students.read'] as const;
    const route = fromList({ permission: two, handlerPermission: two, routePermissions: two });
    expect(accessProblems(route)).toEqual([]);
  });

  it('refuses a guarded handler without any permission', () => {
    const none = aRoute({ permission: undefined, handlerPermission: undefined });
    expect(accessProblems(none)).toEqual(['ProbeController.list: no permission']);
  });

  it('refuses a key outside the catalog, alone or inside a list', () => {
    const typo = aRoute({ permission: 'students.reed' });
    const inList = fromList({ permission: ['short_links.manage', 'nope.read'] });
    expect([typo, inList].flatMap(accessProblems)).toEqual([
      'ProbeController.list: a key outside the catalog',
      'ProbeController.list: a key outside the catalog',
    ]);
  });

  it("refuses a route list beside the handler's own @Permissions", () => {
    const route = fromList({ permission: 'students.read', handlerPermission: 'students.read' });
    expect(accessProblems(route)).toEqual(['ProbeController.list: permissions from two sources']);
  });

  it("refuses a route list beside the class's @Permissions", () => {
    const route = fromList({ classPermission: 'short_links.manage' });
    expect(accessProblems(route)).toEqual(['ProbeController.list: permissions from two sources']);
  });

  it('refuses a route list on a @Public handler', () => {
    const route = fromList({ isPublic: true });
    expect(accessProblems(route)).toEqual([
      'ProbeController.list: permissions on a @Public handler',
    ]);
  });

  it('lets public and signed-in handlers go without a permission', () => {
    const open = aRoute({ isPublic: true, permission: undefined, handlerPermission: undefined });
    const session = aRoute({ signedIn: true, permission: undefined, handlerPermission: undefined });
    expect([open, session].flatMap(accessProblems)).toEqual([]);
  });

  it('refuses a documented handler with no Swagger tag', () => {
    expect(accessProblems(aRoute({ tags: [] }))).toEqual(['ProbeController.list: no Swagger tag']);
  });

  it('lets a handler hidden from the document go without a tag', () => {
    expect(accessProblems(aRoute({ tags: [], inDocument: false }))).toEqual([]);
  });
});
