// Guard for e2e/areas.json (ci.yml «guards»): no spec can silently never run on pull requests.
// Every e2e spec file is in an area or in «developOnly» (not both), every listed spec exists, and every
// area path matches at least one file. Usage: node tools/scripts/ci-checks/e2e-areas/guard.mjs
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listFiles } from './graph.mjs';
import { AREAS_FILE, listSpecs, loadAreas, pathMatches, SPEC_DIR } from './areas.mjs';

/** Problems with the map, as sentences (empty = fine). `specFiles`: paths under e2e/tests/ (folders allowed). */
export function checkMap(map, specFiles, files) {
  const problems = [];
  const inAreas = new Set(Object.values(map.areas).flatMap((a) => a.specs));
  const dev = new Set(map.developOnly);
  for (const s of specFiles) {
    if (!inAreas.has(s) && !dev.has(s))
      problems.push(`${s} is in no area and not in developOnly: it would never run on a PR`);
    if (inAreas.has(s) && dev.has(s))
      problems.push(`${s} is in an area and in developOnly: pick one`);
  }
  const known = new Set(specFiles);
  for (const s of new Set([...inAreas, ...dev]))
    if (!known.has(s)) problems.push(`${s} is listed but there is no ${SPEC_DIR}${s}`);
  for (const [name, a] of Object.entries(map.areas))
    for (const p of a.paths)
      if (!files.some((f) => pathMatches(p, f)))
        problems.push(`area «${name}»: ${p} matches no file`);
  return problems;
}

function main() {
  const root = fileURLToPath(new URL('../../../../', import.meta.url));
  const specs = listSpecs(root);
  const problems = existsSync(join(root, AREAS_FILE))
    ? checkMap(loadAreas(root), specs, listFiles(root))
    : [`${AREAS_FILE} is missing`];
  for (const p of problems) console.error(`::error file=${AREAS_FILE}::${p}`);
  if (problems.length) process.exit(1);
  console.log(`${AREAS_FILE}: ${specs.length} spec files, all mapped or developOnly`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
