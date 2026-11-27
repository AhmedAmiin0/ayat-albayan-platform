// The home docs/62 part 3 §4 gives a marked declaration, or why the code cannot decide it.
import { domainOf } from './files.mjs';

const WEB = new Set(['apps/staff-web', 'apps/family-web', 'packages/web-kit']);
const MOBILE = new Set(['apps/staff-mobile', 'apps/family-mobile', 'packages/mobile-kit']);
const ENUM_KINDS = new Set(['z-enum', 'literal-union']);
const DESIGN_NAME = /(?:colou?rs?|tones?|sizes?|spacings?|radii|radius|shadows?|fonts?)$/i;

const decision = (why) => ({ decision: `needs a decision: ${why}` });

const isProps = (row) => row.name.endsWith('Props');
const isDesign = (row) =>
  row.kind === 'const-object' && (DESIGN_NAME.test(row.name) || row.path.includes('/theme/'));
const isEnum = (row) => ENUM_KINDS.has(row.kind);
const isWire = (row) => row.wire;
const reachesWebAndMobile = (_row, peers) => {
  const users = peers.flatMap((peer) => [peer.ws, ...peer.importers]);
  return users.some((ws) => WEB.has(ws)) && users.some((ws) => MOBILE.has(ws));
};

/** The one domain every peer's path names, or null. */
function domainOfAll(peers) {
  const domains = [...new Set(peers.map((p) => domainOf(p.path)))];
  return domains.length === 1 ? domains[0] : null;
}

const packagePaths = (peers) =>
  [...new Set(peers.filter((p) => p.ws.startsWith('packages/')).map((p) => p.path))].toSorted();

const BY_PACKAGES = [
  (spec, peers) => {
    const domain = domainOfAll(peers);
    return domain
      ? { home: spec.inDomain(domain) }
      : decision(`${spec.what} declared only in apps whose paths name no one domain`);
  },
  (spec, _, paths) => ({ home: spec.inPackage(paths[0]) }),
  (spec, _, paths) =>
    decision(`${spec.what} declared in two or more package files (${paths.join(', ')})`),
];

const owned = (spec) => (_row, peers) => {
  const paths = packagePaths(peers);
  return BY_PACKAGES[Math.min(paths.length, 2)](spec, peers, paths);
};

const RULES = [
  [isProps, () => ({ home: 'stays with its component (Name.types.ts)' })],
  [isDesign, () => ({ home: 'packages/catalog/src/theme' })],
  [
    isEnum,
    owned({
      what: 'an enum',
      inPackage: (path) => `a z.enum in ${path}`,
      inDomain: (domain) => `a z.enum in packages/shared/src/${domain}/`,
    }),
  ],
  [
    isWire,
    owned({
      what: 'wire data',
      inPackage: (path) => `the schema in ${path}`,
      inDomain: (domain) => `the schema in packages/shared/src/${domain}/ with its z.infer type`,
    }),
  ],
  [
    reachesWebAndMobile,
    (_row, peers) => {
      const domain = domainOfAll(peers);
      return domain
        ? { home: `packages/client-core/src/${domain}/` }
        : decision('web and mobile share it but its paths name no one domain');
    },
  ],
];

const FALLBACK = () =>
  decision('not wire data, not an enum and not shared by web and mobile: §4 names no home');

/** `{ home }` or `{ decision }` for `row`; `peers` are its same-shape group, itself included. */
export function homeOf(row, peers) {
  const group = peers.length === 0 ? [row] : peers;
  const rule = RULES.find(([applies]) => applies(row, group));
  return (rule?.[1] ?? FALLBACK)(row, group);
}
