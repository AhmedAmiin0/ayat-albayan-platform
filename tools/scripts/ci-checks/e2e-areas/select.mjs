// Which e2e specs a pull request runs (ci.yml «changes»). Changed files on stdin, one per line:
//   node tools/scripts/ci-checks/e2e-areas/select.mjs [<base-commit>]
//   -> { full, reason, specs } on stdout
// A changed file is followed through the import graph (graph.mjs) to the page routes and API
// modules that use it, and e2e/areas.json names the specs that drive those. FAIL SAFE: anything
// not understood, a file no area lists, an error = { full: true } (the whole suite, as before),
// its reason naming every such file. Pushes never come here.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { areasOf, childRoutes, loadAreas, SPEC_DIR } from './areas.mjs';
import { barrelConsumers, reverseClosure } from './closure.mjs';
import { buildGraph } from './graph.mjs';
import { BUNDLES } from './i18n.mjs';
import { takeBundle } from './select-bundle.mjs';

/** Files e2e never sees (ci.yml's «e2e» gate skips the job when only these change). */
const NO_E2E =
  /^(apps\/(staff|family)-mobile\/|packages\/mobile-kit\/|docs\/|tools\/migrate\/|tools\/scripts\/)|\.md$/;
/** Always the full suite, even inside the paths below (shells, auth, the selection itself …). */
const FULL = [
  /^tools\/scripts\/(ci-checks\/e2e-shards\.mjs|ci-checks\/e2e-areas\/|env\/)/,
  /^apps\/staff-web\/src\/(routeTree\.gen\.ts|components\/shell\/|features\/people\/auth\/)/,
];
/**
 * Unit tests, lint and code-health baselines, env examples, the API's permission parity fixtures
 * (read only by permissions.parity.test.ts and route-walk.test-util.ts): nothing e2e runs.
 */
const UNIT =
  /\.test\.(ts|tsx|mjs)$|^apps\/api\/src\/common\/auth\/parity\/|\/__snapshots__\/|^apps\/staff-web\/src\/(test\/|test-setup\.ts$|i18n-literals\.allow\.json$)|(^|\/)((eslint|oxlint)-suppressions\.json|eslint\.config\.(js|mjs)|lint\.blocks\.mjs|\.env\.example)$|^refactor\/|^knip\.json$/;
/** Code followed through the import graph. */
const GRAPHED =
  /^(apps\/staff-web\/src\/(features|components|routes)\/|apps\/api\/src\/modules\/|packages\/(core|i18n|time|catalog|settings|money|schedule|shared|client-core)\/src\/)/;
const ROUTES = 'apps/staff-web/src/routes/';
const SPEC = /^e2e\/tests\/(?:[^/]+\/)*[^/]+\.spec\.ts$/;
/** Registries that import every route / module: not a use (the route or module itself is). */
const REGISTRY = /^apps\/staff-web\/src\/routeTree\.gen\.ts$|^apps\/api\/src\/app\.module\.ts$/;
/** Code between a changed file and a page or module: followed further, never decides by itself. */
const PASS =
  /^(apps\/staff-web\/src\/(features|components|lib)\/|apps\/api\/src\/scripts\/|packages\/(core|i18n|time|catalog|settings|money|schedule|shared|client-core)\/src\/|e2e\/(scripts|support\/(?!(?:[^/]+\/)*(?:global-setup|durations-reporter)))|e2e\/tests\/(?:[^/]+\/)*(?![^/]*\.setup\.)[^/]+\.ts$)/;

/** A changed spec runs itself (a deleted one: nothing). */
function takeSpec(sel, f) {
  if (existsSync(join(sel.root, f))) sel.specs.add(f.slice(SPEC_DIR.length));
  return '';
}

/** Code: followed from the file (and a barrel's consumers) through the import graph. */
function takeGraphed(sel, f) {
  const { g } = sel;
  // Deleted: whatever imported it changed in this diff too, and is followed instead.
  const gone = !existsSync(join(sel.root, f));
  if (g.files.has(f)) sel.starts.push(f, ...(g.reexportsFrom.has(f) ? barrelConsumers(g, f) : []));
  return g.files.has(f) || gone ? '' : `${f} is outside the import graph`;
}

/** The first kind a changed file matches decides it; none = the full suite. */
const KINDS = [
  { is: (f) => FULL.some((re) => re.test(f)), take: (_, f) => `${f} always runs everything` },
  { is: (f) => NO_E2E.test(f) || UNIT.test(f), take: () => '' },
  { is: (f) => SPEC.test(f), take: takeSpec },
  { is: (f) => BUNDLES.test(f), take: takeBundle },
  { is: (f) => GRAPHED.test(f) && /\.(ts|tsx)$/.test(f), take: takeGraphed },
];

/** One changed file: adds its specs / graph starts to `sel`; a full-suite reason, else ''. */
function takeFile(sel, f) {
  const kind = KINDS.find((k) => k.is(f));
  return kind ? kind.take(sel, f) : `${f} is not mapped to e2e areas`;
}

/** A page or module that uses the change: its areas' specs; a page in no area = a reason. */
function areaReasons(sel, c, routes) {
  // A layout route also changes every page it renders.
  const pages = c.startsWith(ROUTES) ? [c, ...childRoutes(c, routes)] : [c];
  return pages.flatMap((r) => {
    const names = areasOf(sel.map, r);
    for (const n of names) for (const s of sel.map.areas[n].specs) sel.specs.add(s);
    return names.length > 0 ? [] : [`${r} (uses the change) is in no area`];
  });
}

const isPageOrModule = (c) => c.startsWith(ROUTES) || c.startsWith('apps/api/src/modules/');

/** One file that uses the change: the full-suite reasons it gives. */
function useReasons(sel, c, routes) {
  if (SPEC.test(c)) {
    sel.specs.add(c.slice(SPEC_DIR.length));
    return [];
  }
  if (isPageOrModule(c)) return areaReasons(sel, c, routes);
  return PASS.test(c) ? [] : [`${c} (uses the change) runs everything`];
}

/** The pages, modules and specs that use the change: their specs, and the full-suite reasons. */
function followUses(sel) {
  const routes = [...sel.g.files].filter((f) => f.startsWith(ROUTES));
  const users = reverseClosure(sel.g, sel.starts, (x) => REGISTRY.test(x));
  return [...users].flatMap((c) => useReasons(sel, c, routes));
}

/** @param {{ root: string, files: string[], base?: string, graph?: object, map?: object }} opts */
export function selectSpecs({ root, files, base, graph, map: given }) {
  const map = given ?? loadAreas(root);
  const g = graph ?? buildGraph(root);
  const sel = { root, base, map, g, specs: new Set(), starts: [] };
  const reasons = [...files.map((f) => takeFile(sel, f)).filter(Boolean), ...followUses(sel)];
  // Every reason, not only the first: the ci notice then shows what really widened the run.
  if (reasons.length > 0) return full([...new Set(reasons)].join('; '));
  const { specs } = sel;
  return {
    full: false,
    reason: `${specs.size} spec file(s) from the changed areas`,
    specs: [...specs].sort(),
  };
}

const full = (reason) => ({ full: true, reason, specs: [] });

function main() {
  const root = fileURLToPath(new URL('../../../../', import.meta.url));
  const files = readFileSync(0, 'utf8')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  let out;
  try {
    out = selectSpecs({ root, files, base: process.argv[2] });
  } catch (e) {
    out = full(`selection failed: ${e instanceof Error ? e.message : e}`);
  }
  console.log(JSON.stringify(out));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
