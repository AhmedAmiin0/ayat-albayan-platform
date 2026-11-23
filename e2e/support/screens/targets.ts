import { readFileSync } from 'node:fs';
import { hasParams, isFamilyPublic, isStaffPublic } from './plan.ts';
import { fillRoute, parseFullPaths } from './routes.ts';
import type { App, Seeded, Target } from './screens.types.ts';

const PUBLIC: Record<App, (route: string) => boolean> = {
  staff: isStaffPublic,
  family: isFamilyPublic,
};

/** Every route of the app's router, read from its generated route tree. */
function routesOf(app: App): string[] {
  const tree = new URL(`../../../apps/${app}-web/src/routeTree.gen.ts`, import.meta.url);
  return parseFullPaths(readFileSync(tree, 'utf8')).filter((route) => route !== '/');
}

/** The signed-in pages, or the signed-out ones with `signedOut`, filled from the seeded rows. */
export function targetsOf(app: App, input: { seeded: Seeded; signedOut: boolean }): Target[] {
  const routes = routesOf(app).filter((route) => PUBLIC[app](route) === input.signedOut);
  return routes.map((route) => ({ route, ...fillRoute(route, input.seeded) }));
}

/** The signed-in pages without params, for the empty-database pass. */
export function emptyTargetsOf(app: App): Target[] {
  const routes = routesOf(app).filter((route) => !PUBLIC[app](route) && !hasParams(route));
  return routes.map((route) => ({ route, url: route, how: 'direct, empty database' }));
}
