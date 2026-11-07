// Config parity (docs/31b §5): a rule with no finding today still has to be on. For every file
// ESLint lints, each rule ESLint turns on must be on in Oxlint's config for that file (its
// overrides resolved in order: `files` match, no `excludeFiles` match), with the same options;
// and Oxlint must lint every such file (oxlint --debug=files).
import { isDeepStrictEqual } from 'node:util';
import { matchesGlob } from 'node:path';
import { oxlintName } from '@ab/config/oxlint';

const matchesAny = (file, globs = []) => globs.some((glob) => matchesGlob(file, glob));

/** An ESLint or Oxlint rule value → its options (`[2, {}]`, `'error'` and `[2]`: none). */
export function optionsOf(value) {
  const options = Array.isArray(value) ? value.slice(1) : [];
  return isDeepStrictEqual(options, [{}]) ? [] : options;
}

const OFF = new Set(['off', 0]);
const levelOf = (value) => (Array.isArray(value) ? value[0] : value);

/** The rules Oxlint's composed `config` turns on for `file` (repo-relative). */
export function oxlintRulesFor(config, file) {
  const rules = { ...config.rules };
  for (const o of config.overrides) {
    const applies = matchesAny(file, o.files) && !matchesAny(file, o.excludeFiles);
    if (applies) Object.assign(rules, o.rules);
  }
  return Object.fromEntries(Object.entries(rules).filter(([, v]) => !OFF.has(levelOf(v))));
}

/** One file: ESLint's resolved rules (`{ rule: [2, ...options] }`) against Oxlint's. */
export function fileDiff(eslintRules, oxlintRules) {
  const on = Object.entries(eslintRules).filter(([, v]) => !OFF.has(levelOf(v)));
  const lost = on.filter(([rule]) => !oxlintRules[oxlintName(rule)]).map(([rule]) => rule);
  const oxlintOptions = (rule) => optionsOf(oxlintRules[oxlintName(rule)]);
  const same = ([rule, v]) => isDeepStrictEqual(optionsOf(v), oxlintOptions(rule));
  const options = on
    .filter(([rule]) => oxlintRules[oxlintName(rule)])
    .filter((entry) => !same(entry))
    .map(([rule]) => rule);
  return { lost, options };
}

/** Every file's diff → `kind rule (n files, e.g. path)` lines; `unlinted`: files Oxlint skips. */
export function summarize(diffs, unlinted) {
  const seen = new Map();
  const hits = diffs.flatMap(({ file, lost, options }) => [
    ...lost.map((rule) => ({ file, k: `off in Oxlint: ${rule}` })),
    ...options.map((rule) => ({ file, k: `other options: ${rule}` })),
  ]);
  for (const { file, k } of hits) {
    seen.set(k, { n: (seen.get(k)?.n ?? 0) + 1, file: seen.get(k)?.file ?? file });
  }
  const lines = [...seen].map(([k, { n, file }]) => `${k} (${String(n)} files, e.g. ${file})`);
  return [...lines.sort(), ...unlinted.map((file) => `not linted by Oxlint: ${file}`)];
}
