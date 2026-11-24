// The rules a composed Oxlint config turns on for one file: its overrides applied in order, as
// Oxlint resolves them (every `files` glob may match, no `excludeFiles` glob may; later wins).
import { matchesGlob } from 'node:path';

const OFF = new Set(['off', 0]);
const levelOf = (value) => (Array.isArray(value) ? value[0] : value);
const matchesAny = (file, globs = []) => globs.some((glob) => matchesGlob(file, glob));
const applies = (file) => (o) => matchesAny(file, o.files) && !matchesAny(file, o.excludeFiles);

/** `{ rule: value }` of every rule `config` turns on for `file` (relative to the config). */
export function rulesFor(config, file) {
  const layers = config.overrides.filter(applies(file)).map((o) => o.rules);
  const rules = Object.assign({ ...config.rules }, ...layers);
  return Object.fromEntries(Object.entries(rules).filter(([, v]) => !OFF.has(levelOf(v))));
}
