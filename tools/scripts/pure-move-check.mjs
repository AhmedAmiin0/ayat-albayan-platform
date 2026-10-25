// Pure-move gate for refactor PRs (docs/27 §4, §6). Usage: node tools/scripts/pure-move-check.mjs <base> [head]
// Against the merge base it allows only: renames, changed module paths (import/export/require/import()/vi|jest
// mock strings), new index.ts barrels made of `export … from` lines, and path-dependent config (docs, workflows,
// vitest/jest/tsconfig/eslint configs, refactor/ maps and allow-lists, the generated route tree). Anything else fails.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { sameButRenames, substitutions } from './pure-move-tokens.mjs';

const CODE = /\.[cm]?[jt]sx?$/;
const CONFIG = [
  /\.md$/,
  /^\.github\/workflows\/[^/]+\.ya?ml$/,
  /(^|\/)(vitest|vite|jest|playwright)\.config\.[cm]?[jt]s$/,
  /(^|\/)tsconfig[^/]*\.json$/,
  /(^|\/)eslint\.config\.[cm]?js$/,
  /(^|\/)knip\.json$/,
  /^refactor\//,
  /(^|\/)routeTree\.gen\.ts$/,
];
const Q = `(['"])[^'"\\n]*\\`;
const STATEMENTS = new RegExp(
  [
    `^[ \\t]*import\\s+(?:type\\s+)?(?:[\\w$]+\\s*,?\\s*)?(?:\\{[^}]*\\}|\\*\\s+as\\s+[\\w$]+)?\\s*from\\s*${Q}1[ \\t]*;?`,
    `^[ \\t]*export\\s+(?:type\\s+)?(?:\\{[^}]*\\}|\\*(?:\\s+as\\s+[\\w$]+)?)\\s*from\\s*${Q}2[ \\t]*;?`,
    `^[ \\t]*import\\s*${Q}3[ \\t]*;?`,
    `^[ \\t]*import\\s+[\\w$]+\\s*=\\s*require\\(\\s*${Q}4\\s*\\)[ \\t]*;?`,
  ].join('|'),
  'gm',
);
const SPEC = /(['"`])[^'"`\n]*\1/;
const CALLS = /\b((?:vi|jest)\.\w+|require(?:\.resolve)?|import)(\s*(?:<[^>]*>)?\(\s*)(['"`])[^'"`\n]*\3/g;

const squash = (s) => s.replace(/\s+/g, ' ').replace(/,\s*}/g, ' }').replace(/{\s*/g, '{ ').replace(/\s*}/g, ' }').trim();

/** A source split into its module statements (paths blanked) and the rest (call paths blanked). */
export function normalize(text) {
  const statements = (text.match(STATEMENTS) ?? []).map((s) => squash(s.replace(SPEC, '"<path>"'))).sort();
  const body = squash(text.replace(STATEMENTS, '').replace(CALLS, '$1$2"<path>"'));
  return { statements, body };
}

/** True when the only differences are module paths and literals changed by a rename (`subs`). */
export function onlyPathsChanged(before, after, subs = new Map()) {
  const a = normalize(before);
  const b = normalize(after);
  if (JSON.stringify(a.statements) !== JSON.stringify(b.statements)) return false;
  return a.body === b.body || sameButRenames(a.body, b.body, subs);
}

/** A new barrel: an index file made only of `export … from` lines. */
export function isBarrel(file, text) {
  if (!/(^|\/)index\.tsx?$/.test(file)) return false;
  const rest = text.replace(STATEMENTS, '').trim();
  const lines = text.match(STATEMENTS) ?? [];
  return rest === '' && lines.length > 0 && lines.every((l) => /^\s*export\b/.test(l));
}

const isConfig = (file) => CONFIG.some((re) => re.test(file));

/** Why one `git diff --name-status` entry is not a pure move (null = fine), and its kind. */
export function classify(entry, read, subs = new Map()) {
  const { status, from, to } = entry;
  if (status === 'R100') return { kind: 'rename' };
  if (isConfig(to)) return { kind: 'config' };
  if (status === 'A') {
    return isBarrel(to, read('head', to)) ? { kind: 'barrel' } : { kind: 'bad', why: 'new file (only index.ts barrels may be added)' };
  }
  if (status === 'D') return { kind: 'bad', why: 'deleted file (a move is a rename)' };
  if ((status.startsWith('R') || status === 'M') && CODE.test(to)) {
    return onlyPathsChanged(read('base', from), read('head', to), subs)
      ? { kind: 'paths' }
      : { kind: 'bad', why: 'changes more than import/export/mock paths' };
  }
  return { kind: 'bad', why: `${status}: not a move` };
}

/** Parses `git diff --name-status -M` output. */
export function parseNameStatus(out) {
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [status = '', a = '', b] = line.split('\t');
      return { status, from: a, to: b ?? a };
    });
}

function main([base, head = 'HEAD']) {
  if (!base) {
    console.error('usage: pure-move-check.mjs <base> [head]');
    process.exit(2);
  }
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28 });
  const mergeBase = git('merge-base', base, head).trim();
  const refs = { base: mergeBase, head };
  const read = (side, file) => git('show', `${refs[side]}:${file}`);
  const entries = parseNameStatus(git('diff', '--name-status', '-M50%', '--no-color', mergeBase, head));
  const subs = substitutions(entries.filter((e) => e.status.startsWith('R')).map((e) => [e.from, e.to]));
  const counts = { rename: 0, paths: 0, barrel: 0, config: 0, bad: 0 };
  for (const e of entries) {
    const result = classify(e, read, subs);
    counts[result.kind] += 1;
    if (result.kind === 'bad') console.log(`✗ ${e.from === e.to ? e.to : `${e.from} → ${e.to}`}: ${result.why}`);
    if (result.kind === 'config') console.log(`• config: ${e.to}`);
  }
  console.log(`pure-move-check: ${counts.rename} renames, ${counts.paths} path rewrites, ${counts.barrel} barrels, ${counts.config} config, ${counts.bad} not pure`);
  if (counts.bad > 0) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main(process.argv.slice(2));
