// Check 9: a route file only maps a URL to one page (docs/63 §2). A TanStack file holds router
// config and at most one adapter reading the URL; an expo-router file renders one element.
import ts from 'typescript';
import { isJsxish } from './arrows.mjs';
import { partsOf } from './body.mjs';
import { findHookCall } from './find.mjs';

const ROUTE_READ = /^(?:Route\.use\w*|getRouteApi|\w+\.use\w*)\(/;

const isElement = (e) =>
  e !== undefined && isJsxish(e) && !ts.isConditionalExpression(e) && !ts.isBinaryExpression(e);

const readsRoute = (statement, sf) =>
  statement.declarationList.declarations.every((d) =>
    ROUTE_READ.test(d.initializer?.getText(sf) ?? ''),
  );

function adapterFailure(c, sf, reads) {
  const { decls, guards, ret, stray } = partsOf(c.fn);
  const plain = stray.length === 0 && guards.length === 0 && isElement(ret);
  const ok = plain && decls.every((s) => reads(s, sf)) && findHookCall(ret) === undefined;
  return ok ? null : `${c.name}: a route component returns one element and reads only the URL`;
}

const TANSTACK = (c, sf) => adapterFailure(c, sf, readsRoute);
const EXPO = (c, sf) => adapterFailure(c, sf, () => false);

/** Check 9's reason per component of the route file at `path`, or null. */
export function routeFailures(path, comps, sf) {
  const isExpo = /^apps\/[^/]+\/app\//.test(path);
  const pages = comps.filter((c) => !(isExpo && c.name === 'ErrorBoundary'));
  const many = pages.length > 1 ? `${pages.length} components: a route file holds one` : null;
  return comps.map((c) => {
    const own = pages.includes(c) ? (isExpo ? EXPO : TANSTACK)(c, sf) : null;
    return { c, why: many ?? own };
  });
}
