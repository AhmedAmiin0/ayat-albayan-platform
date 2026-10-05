import { type ModulePermission } from './catalogue.js';
import { ROUTE_PERMISSIONS } from './route-permissions.js';
import { EXEMPT_PREFIXES, type RouteRule } from './route-rules.js';

const segments = (path: string): string[] => path.split('?')[0]?.split('/').filter((s) => s !== '') ?? [];
const same = (a: string, b: string): boolean => a === b || a.startsWith(':') || b.startsWith(':');

/** How many leading segments of `path` the prefix covers; -1 when it does not match. */
function covered(prefix: string, path: string): number {
  const want = segments(prefix);
  const have = segments(path);
  if (want.length > have.length) return -1;
  return want.every((seg, i) => same(seg, have[i] ?? '')) ? want.length : -1;
}

export const isExemptRoute = (path: string): boolean => EXEMPT_PREFIXES.some((p) => covered(p, path) >= 0);

/** `method` is matched case-insensitively; HEAD counts as GET. */
export function permissionForRoute(
  method: string,
  path: string,
  rules: readonly RouteRule[] = ROUTE_PERMISSIONS,
): ModulePermission | null {
  const verb = method.toUpperCase() === 'HEAD' ? 'GET' : method.toUpperCase();
  let best: { rule: RouteRule; depth: number; byMethod: boolean } | null = null;
  for (const rule of rules) {
    if (rule.method && rule.method !== verb) continue;
    const depth = covered(rule.prefix, path);
    if (depth < 0) continue;
    const byMethod = rule.method !== undefined;
    if (!best || depth > best.depth || (depth === best.depth && byMethod && !best.byMethod)) {
      best = { rule, depth, byMethod };
    }
  }
  return best?.rule.permission ?? null;
}
