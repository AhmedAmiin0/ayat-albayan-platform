// Which e2e specs a pull request runs (ci.yml «changes»). Usage, changed files on stdin, one per line:
//   node tools/scripts/ci-checks/e2e-areas/select.mjs [<base-commit>]   -> { full, reason, specs } on stdout
// A changed file is followed through the import graph (graph.mjs) to the page routes and API modules that
// use it, and e2e/areas.json names the specs that drive those. FAIL SAFE: anything not understood, a file
// no area lists, an error = { full: true } (the whole suite, as before). Pushes never come here.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { areasOf, childRoutes, loadAreas, SPEC_DIR } from './areas.mjs';
import { barrelConsumers, reverseClosure } from './closure.mjs';
import { buildGraph } from './graph.mjs';
import { BUNDLES, changedKeys, keyUsers } from './i18n.mjs';

/** Files e2e never sees (the existing «e2e» gate in ci.yml skips the job when only these change). */
const NO_E2E = /^(apps\/mobile\/|docs\/|tools\/migrate\/|tools\/scripts\/)|\.md$/;
/** Always the full suite, even inside the paths below (shells, auth, the selection itself, …). */
const FULL = [
  /^tools\/scripts\/(ci-checks\/e2e-shards\.mjs|ci-checks\/e2e-areas\/|env\/)/,
  /^apps\/web\/src\/(routeTree\.gen\.ts|components\/shell\/|features\/people\/auth\/)/,
];
/** Unit tests, lint and code-health baselines, env examples: nothing e2e runs. */
const UNIT =
  /\.test\.(ts|tsx|mjs)$|\/__snapshots__\/|^apps\/web\/src\/(test\/|test-setup\.ts$|i18n-literals\.allow\.json$)|(^|\/)(eslint-suppressions\.json|eslint\.config\.(js|mjs)|\.env\.example)$|^refactor\/|^knip\.json$/;
/** Code followed through the import graph. */
const GRAPHED =
  /^(apps\/web\/src\/(features|components|routes)\/|apps\/api\/src\/modules\/|packages\/(core|i18n|shared|client-core)\/src\/)/;
const ROUTES = 'apps/web/src/routes/';
const SPEC = /^e2e\/tests\/(?:[^/]+\/)*[^/]+\.spec\.ts$/;
/** Registries that import every route / module: not a use (the route or module itself is). */
const REGISTRY = /^apps\/web\/src\/routeTree\.gen\.ts$|^apps\/api\/src\/app\.module\.ts$/;
/** Code between a changed file and a page or module: followed further, never decides by itself. */
const PASS =
  /^(apps\/web\/src\/(features|components|lib)\/|apps\/api\/src\/scripts\/|packages\/(core|i18n|shared|client-core)\/src\/|e2e\/(scripts|support\/(?!(?:[^/]+\/)*(?:global-setup|durations-reporter)))|e2e\/tests\/(?:[^/]+\/)*(?![^/]*\.setup\.)[^/]+\.ts$)/;
/** The area whose page lists every UI string: runs on any key change. */
const EVERY_KEY_AREA = 'translations';

/** @param {{ root: string, files: string[], base?: string, graph?: object, map?: object }} opts */
export function selectSpecs({ root, files, base, graph, map: given }) {
  const map = given ?? loadAreas(root);
  const g = graph ?? buildGraph(root);
  const specs = new Set();
  const starts = [];
  for (const f of files) {
    if (FULL.some((re) => re.test(f))) return full(`${f} always runs everything`);
    if (NO_E2E.test(f) || UNIT.test(f)) continue;
    if (SPEC.test(f)) {
      if (existsSync(join(root, f))) specs.add(f.slice(SPEC_DIR.length));
    } else if (BUNDLES.test(f)) {
      const r = bundleUsers({ root, file: f, base, graph: g });
      if (r.reason) return full(r.reason);
      if (!map.areas[EVERY_KEY_AREA]) return full(`no «${EVERY_KEY_AREA}» area for ${f}`);
      starts.push(...r.users);
      if (r.keys) for (const s of map.areas[EVERY_KEY_AREA].specs) specs.add(s);
    } else if (GRAPHED.test(f) && /\.(ts|tsx)$/.test(f)) {
      if (g.files.has(f)) starts.push(f, ...(g.reexportsFrom.has(f) ? barrelConsumers(g, f) : []));
      else if (existsSync(join(root, f))) return full(`${f} is outside the import graph`);
      // Deleted: whatever imported it changed in this diff too, and is followed instead.
    } else return full(`${f} is not mapped to e2e areas`);
  }
  const routes = [...g.files].filter((f) => f.startsWith(ROUTES));
  for (const c of reverseClosure(g, starts, (x) => REGISTRY.test(x))) {
    if (SPEC.test(c)) specs.add(c.slice(SPEC_DIR.length));
    else if (c.startsWith(ROUTES) || c.startsWith('apps/api/src/modules/')) {
      // A layout route also changes every page it renders.
      for (const r of c.startsWith(ROUTES) ? [c, ...childRoutes(c, routes)] : [c]) {
        const names = areasOf(map, r);
        if (!names.length) return full(`${r} (uses the change) is in no area`);
        for (const n of names) for (const s of map.areas[n].specs) specs.add(s);
      }
    } else if (!PASS.test(c)) return full(`${c} (uses the change) runs everything`);
  }
  return {
    full: false,
    reason: `${specs.size} spec file(s) from the changed areas`,
    specs: [...specs].sort(),
  };
}

const full = (reason) => ({ full: true, reason, specs: [] });

/** The files that read a changed key of one bundle, or { reason } for the full suite. */
function bundleUsers({ root, file, base, graph: g }) {
  if (!base) return { reason: `${file} changed and there is no base commit to compare` };
  const before = JSON.parse(
    execFileSync('git', ['show', `${base}:${file}`], { cwd: root, encoding: 'utf8' }),
  );
  const after = JSON.parse(readFileSync(join(root, file), 'utf8'));
  const keys = changedKeys(before, after);
  // The mobile app reads the same bundles: a key only it reads is known, and needs no e2e.
  const mobile = execFileSync('git', ['ls-files', 'apps/mobile'], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f));
  const read = (f) => [f, readFileSync(join(root, f), 'utf8')];
  const sources = new Map([...[...g.files].map(read), ...mobile.map(read)]);
  const { users, unknown } = keyUsers(keys, sources, (f) => f.startsWith('apps/mobile/'));
  if (unknown.length)
    return { reason: `${file}: no reader found for ${unknown.slice(0, 3).join(', ')}` };
  return { users: [...users], keys: keys.length };
}

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
