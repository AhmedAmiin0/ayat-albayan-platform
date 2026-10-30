// Pure-move gate for refactor PRs (docs/27 §4, §6). Usage: node tools/scripts/pure-move-check.mjs <base> [head]
// Against the merge base it allows only: renames, changed module paths (import/export/require/import()/vi|jest
// mock strings), identifier renames listed in the diff's move maps (pure-move/identifiers.mjs), new index.ts
// barrels made of `export … from` lines, config that only follows moved paths (code configs as code,
// pure-move/configs.mjs for workflows, tsconfig, knip.json and refactor/) and path-keyed baselines whose
// entries only follow their moved files (pure-move/baselines.mjs: eslint suppressions, knip, folder cap). Anything else fails.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { classifyBaseline } from './pure-move/baselines.mjs';
import { classifyConfig, rewritePaths as rewriteText } from './pure-move/configs.mjs';
import { CODE_SPECS, grepFiles, identifierTable, renameIdentifiers, renameProblems } from './pure-move/identifiers.mjs';
import { reexportsOf, renameTable, samePath } from './pure-move-paths.mjs';
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
const SPEC = /(['"`])([^'"`\n]*)\1/;
const CALLS =
  /\b((?:vi|jest)\.(?:mock|doMock|unmock|doUnmock|importActual|importMock|requireActual|requireMock|createMockFromModule)|require(?:\.resolve)?|import)(\s*(?:<[^>]*>)?\(\s*)(['"`])([^'"`\n]*)\3/g;

const squash = (s) => s.replace(/\s+/g, ' ').replace(/,\s*}/g, ' }').replace(/{\s*/g, '{ ').replace(/\s*}/g, ' }').trim();

/** A source split into its module statements and the rest, with every module path pulled out. */
export function normalize(text) {
  const paths = [];
  const statements = (text.match(STATEMENTS) ?? []).map((st) => {
    paths.push(SPEC.exec(st)?.[2] ?? '');
    return squash(st.replace(SPEC, '"<path>"'));
  });
  const raw = text.replace(STATEMENTS, '').replace(CALLS, (_m, name, open, _q, path) => {
    paths.push(path);
    return `${name}${open}"<path>"`;
  });
  return { statements, body: squash(raw), raw, paths };
}

/**
 * True when the only differences are module paths that still name the same (moved) file, and literals
 * changed by a rename (`ctx.subs`). `ctx`: { from, to, table, subs } (file paths and rename tables).
 */
export function onlyPathsChanged(before, after, ctx = {}) {
  const a = normalize(before);
  const b = normalize(after);
  const c = { from: ctx.from ?? 'x.ts', to: ctx.to ?? 'x.ts', table: ctx.table ?? new Map(), reexports: ctx.reexports };
  if (JSON.stringify(a.statements) !== JSON.stringify(b.statements) || a.paths.length !== b.paths.length) return false;
  if (!a.paths.every((p, i) => p === b.paths[i] || samePath(c, p, b.paths[i] ?? ''))) return false;
  return a.body === b.body || sameButRenames(a.raw, b.raw, { subs: ctx.subs ?? new Map(), from: c.from, to: c.to });
}

/** A new barrel: an index file made only of `export … from` lines. */
export function isBarrel(file, text) {
  if (!/(^|\/)index\.tsx?$/.test(file)) return false;
  const rest = text.replace(STATEMENTS, '').trim();
  const lines = text.match(STATEMENTS) ?? [];
  return rest === '' && lines.length > 0 && lines.every((l) => /^\s*export\b/.test(l));
}

/** The module paths of a barrel's `export … from` lines (null when the file is not a barrel). */
export const barrelPaths = (file, text) => (text && isBarrel(file, text) ? normalize(text).paths : null);

/** Docs and JSON/YAML data: only whole repo paths of moved files may change (as the codemod writes them). */
const TEXT = /(^docs\/.*|\.md|(?<!tsconfig[^/]*|knip)\.json|\.ya?ml)$/;
export { rewriteText };

const isConfig = (file) => CONFIG.some((re) => re.test(file));

/** Why one `git diff --name-status` entry is not a pure move (null = fine), and its kind. */
export function classify(entry, read, ctx = {}) {
  const { status, from, to } = entry;
  const baseline = classifyBaseline(entry, read, ctx);
  if (baseline) return baseline;
  if (status === 'R100') return { kind: 'rename' };
  if (TEXT.test(to) && !/^(\.github|refactor)\//.test(to) && status !== 'A' && status !== 'D') {
    const renamed = rewriteText(read('base', from), ctx.renames ?? []);
    return renamed === read('head', to) ? { kind: 'paths' } : { kind: 'bad', why: 'changes more than moved file paths' };
  }
  if (isConfig(to) && !CODE.test(to)) return classifyConfig(entry, read, ctx.renames ?? []);
  if (status === 'A') {
    return isBarrel(to, read('head', to)) ? { kind: 'barrel' } : { kind: 'bad', why: 'new file (only index.ts barrels may be added)' };
  }
  if (status === 'D') return { kind: 'bad', why: 'deleted file (a move is a rename)' };
  if ((status.startsWith('R') || status === 'M') && CODE.test(to)) {
    const base = renameIdentifiers(read('base', from), ctx.ids ?? new Map());
    if (!onlyPathsChanged(base, read('head', to), { ...ctx, from, to })) return { kind: 'bad', why: 'changes more than import/export/mock paths' };
    return { kind: isConfig(to) ? 'config' : 'paths' };
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
  const renames = entries.filter((e) => e.status.startsWith('R')).map((e) => [e.from, e.to]);
  const gone = (dir) => git('ls-tree', '-d', '--name-only', head, '--', dir).trim() === '';
  const readHead = (file) => (git('ls-tree', '--name-only', head, '--', file).trim() ? read('head', file) : '');
  const ids = identifierTable(entries, read);
  const grep = (re, files = CODE_SPECS) => grepFiles(() => git('grep', '-lE', re, mergeBase, '--', ...files));
  const ctx = { renames, gone, ids, table: renameTable(renames), subs: substitutions(renames, gone), reexports: reexportsOf(readHead, barrelPaths) };
  const problems = renameProblems(ids, grep, entries.map((e) => e.from));
  for (const p of problems) console.log(`✗ renames: ${p}`);
  const counts = { rename: 0, paths: 0, barrel: 0, config: 0, bad: problems.length };
  for (const e of entries) {
    const result = classify(e, read, ctx);
    counts[result.kind] += 1;
    if (result.kind === 'bad') console.log(`✗ ${e.from === e.to ? e.to : `${e.from} → ${e.to}`}: ${result.why}`);
    if (result.kind === 'config') console.log(`• config: ${e.to}`);
  }
  console.log(`pure-move-check: ${counts.rename} renames, ${counts.paths} path rewrites, ${counts.barrel} barrels, ${counts.config} config, ${counts.bad} not pure`);
  if (counts.bad > 0) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main(process.argv.slice(2));
