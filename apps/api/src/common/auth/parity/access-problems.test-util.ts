import { isPermission } from '@ab/catalog';
import { permissionKeys as keysOf, type RouteAccess } from './route-walk.test-util';

const isGuarded = (route: RouteAccess): boolean => !route.isPublic && !route.signedIn;

const hasRouteList = (route: RouteAccess): boolean => route.routePermissions !== undefined;

const lacksPermission = (route: RouteAccess): boolean =>
  isGuarded(route) && keysOf(route).length === 0;

const hasUnknownKey = (route: RouteAccess): boolean =>
  isGuarded(route) && !keysOf(route).every(isPermission);

/** The route object's list must be the only source: no handler or class @Permissions beside it. */
const hasTwoSources = (route: RouteAccess): boolean =>
  hasRouteList(route) &&
  (route.handlerPermission !== route.routePermissions || route.classPermission !== undefined);

const isPublicWithList = (route: RouteAccess): boolean => route.isPublic && hasRouteList(route);

const lacksTag = (route: RouteAccess): boolean => route.inDocument && route.tags.length === 0;

const RULES: readonly (readonly [string, (route: RouteAccess) => boolean])[] = [
  ['no permission', lacksPermission],
  ['a key outside the catalog', hasUnknownKey],
  ['permissions from two sources', hasTwoSources],
  ['permissions on a @Public handler', isPublicWithList],
  ['no Swagger tag', lacksTag],
];

/** Each access rule this handler breaks, as `Controller.handler: problem`. */
export function accessProblems(route: RouteAccess): string[] {
  return RULES.filter(([, breaks]) => breaks(route)).map(([problem]) => `${route.key}: ${problem}`);
}
