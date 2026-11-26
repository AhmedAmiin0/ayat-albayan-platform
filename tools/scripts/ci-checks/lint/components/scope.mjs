// Which files guard:components reads (docs/63 §3): non-test .tsx under the six frontend
// workspaces' src/ (and the mobile apps' app/), minus showcases, test helpers and icon sets.

export const WORKSPACES = [
  'apps/staff-web',
  'apps/family-web',
  'apps/staff-mobile',
  'apps/family-mobile',
  'packages/web-kit',
  'packages/mobile-kit',
];

/** Finished workspaces (docs/63 §3 phase C): any offender in them fails. Only ever grows. */
export const STRICT = [];

const TESTS =
  /\.(?:test|spec)\.[cm]?[jt]sx?$|\/(?:tests?|testing|__tests__|__fixtures__|fixtures)\//;
const EXEMPT = /\.(?:showcase|testing)\.tsx$|-icons\.tsx$/;
const SOURCE = /^(?:apps|packages)\/[^/]+\/(?:src|app)\//;
const ROUTE = /^apps\/[^/]+\/(?:src\/routes|app)\//;

export const isTest = (path) => TESTS.test(path);

export const workspaceOf = (path) => WORKSPACES.find((ws) => path.startsWith(`${ws}/`));

export const isRoute = (path) => ROUTE.test(path);

export const isScanned = (path) =>
  path.endsWith('.tsx') &&
  SOURCE.test(path) &&
  workspaceOf(path) !== undefined &&
  !TESTS.test(path) &&
  !EXEMPT.test(path);
