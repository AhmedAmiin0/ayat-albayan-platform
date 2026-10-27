// e2e/areas.json: which page routes and API modules each e2e spec drives (the PR spec selection).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const AREAS_FILE = 'e2e/areas.json';
export const SPEC_DIR = 'e2e/tests/';

/** The map, checked: every area has paths and specs, every list holds strings. Throws otherwise. */
export function loadAreas(root) {
  const map = JSON.parse(readFileSync(join(root, AREAS_FILE), 'utf8'));
  return checkAreas(map);
}

export function checkAreas(map) {
  const strings = (v) =>
    Array.isArray(v) && v.length > 0 && v.every((s) => typeof s === 'string' && s);
  const areas = Object.entries(map?.areas ?? {});
  if (!areas.length) throw new Error(`${AREAS_FILE}: no areas`);
  for (const [name, a] of areas)
    if (!strings(a?.paths) || !strings(a?.specs))
      throw new Error(`${AREAS_FILE}: area «${name}» needs paths and specs`);
  if (!Array.isArray(map.developOnly) || !map.developOnly.every((s) => typeof s === 'string'))
    throw new Error(`${AREAS_FILE}: developOnly must be a list of spec files`);
  return map;
}

/** A path entry matches a file: «dir/» = everything under it, else the exact file. */
export const pathMatches = (entry, file) =>
  entry.endsWith('/') ? file.startsWith(entry) : file === entry;

/** Names of the areas that list `file`. */
export const areasOf = (map, file) =>
  Object.entries(map.areas)
    .filter(([, a]) => a.paths.some((p) => pathMatches(p, file)))
    .map(([name]) => name);
