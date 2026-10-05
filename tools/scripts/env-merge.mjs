#!/usr/bin/env node
// Merge deploy values into an existing .env (the staging server's), for the GitHub deploy workflow.
//   node tools/scripts/env-merge.mjs <current .env> KEY1 KEY2 … > new.env
// Each listed KEY is read from this process's environment (GitHub environment secrets/variables).
// A key that is unset or empty is left exactly as the server has it, so a half-filled GitHub
// environment never wipes a working value. Comments, blank lines and order are kept; new keys are
// appended. Values are written literally (docker compose env_file), one line each.
import { readFileSync } from 'node:fs';

const KEY = /^[A-Z_][A-Z0-9_]*$/;

/** The key of a `KEY=value` line, or null for comments, blanks and anything else. */
export function keyOf(line) {
  const at = line.indexOf('=');
  if (at <= 0) return null;
  const key = line.slice(0, at).trim();
  return KEY.test(key) ? key : null;
}

/** Only non-empty, single-line values: a newline would split one secret into two .env lines. */
export function overridesFrom(keys, env) {
  const out = new Map();
  for (const key of keys) {
    if (!KEY.test(key)) throw new Error(`bad key: ${key}`);
    const value = env[key];
    if (value === undefined || value === '') continue;
    if (/[\r\n]/.test(value)) throw new Error(`${key} has a line break`);
    out.set(key, value);
  }
  return out;
}

/** `current` with every override applied in place (first occurrence) and the rest appended. */
export function mergeEnv(current, overrides) {
  const seen = new Set();
  const lines = current.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
  const kept = lines.flatMap((line) => {
    const key = keyOf(line);
    if (!key || !overrides.has(key)) return [line];
    if (seen.has(key)) return [];
    seen.add(key);
    return [`${key}=${overrides.get(key)}`];
  });
  const added = [...overrides].filter(([k]) => !seen.has(k)).map(([k, v]) => `${k}=${v}`);
  return [...(current.trim() ? kept : []), ...added].join('\n') + '\n';
}

/** The key names only, for the log: never the values. */
export const changedKeys = (overrides) => [...overrides.keys()].sort();

function main() {
  const [file, ...keys] = process.argv.slice(2);
  if (!file) {
    console.error('usage: env-merge.mjs <current .env> KEY…');
    process.exit(1);
  }
  const overrides = overridesFrom(keys, process.env);
  process.stdout.write(mergeEnv(readFileSync(file, 'utf8'), overrides));
  console.error(`env-merge: set ${changedKeys(overrides).join(', ') || '(nothing)'}`);
}

if (process.argv[1]?.endsWith('env-merge.mjs')) main();
