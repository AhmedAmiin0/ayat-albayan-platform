// The absolute-imports codemod (docs/32 R12): an app names its own files through `#/`, defined by
// its package.json `imports`, with the file's extension (absolute-resolve.mjs). Rewrites every
// parent-relative path (`../x`), every old tsconfig-paths `@/x` and every bare `#/x` to the
// exact `#/x.ts`: static imports, re-exports, `import()`, `import('x').T`, require and the vi /
// jest mock paths (move-module/specifiers.ts finds them). A sibling (`./x`) and a path that leaves
// the alias folder (`../package.json` from src/, `../(tabs)/x` in mobile app/) stay; nothing else
// changes. Deterministic (sorted files, span edits only): a second run finds nothing.
// Usage: pnpm imports:absolute -- <workspace|paths…> [--write]   (dry run without --write)
//   workspace: api, staff-web, staff-mobile or apps/<name>; paths: files or folders inside apps.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Project } from 'ts-morph';
import { applyEdits, specifierNodes } from '../ci-checks/move-module/specifiers.ts';
import { absoluteSpec, aliasOf, isAppPath } from './absolute-resolve.mjs';

const CODE = /\.[cm]?[jt]sx?$/;
const SKIP = new Set(['node_modules', 'dist', 'coverage', '.expo', '.turbo', 'playwright-report', 'test-results']);

/** `file`'s text with its app paths rewritten; `kept`: the `../` / `@/` ones left as is. */
export function rewriteText(project, alias, { file, text }) {
  const sf = project.createSourceFile(`/virtual/${file}`, text, { overwrite: true });
  const found = specifierNodes(sf).filter((s) => isAppPath(s.value));
  project.removeSourceFile(sf);
  const all = found.map((s) => ({ ...s, to: absoluteSpec(alias, file, s.value) }));
  const edits = all.flatMap((s) => (s.to === null ? [] : [{ start: s.start, end: s.end, value: s.to }]));
  const out = edits.length === 0 ? text : applyEdits(text, edits);
  const kept = all.filter((s) => s.to === null && !s.value.startsWith('#/')).length;
  return { text: out, rewritten: edits.length, kept };
}

/** Code files under `rel` (a file or a folder, repo-relative), sorted. */
export function codeFiles(root, rel) {
  const abs = posix.join(root, rel);
  if (!statSync(abs).isDirectory()) return CODE.test(rel) ? [rel] : [];
  const byName = (a, b) => (a.name < b.name ? -1 : 1);
  const entries = readdirSync(abs, { withFileTypes: true }).sort(byName);
  return entries.flatMap((e) => {
    if (SKIP.has(e.name)) return [];
    const path = posix.join(rel, e.name);
    if (e.isDirectory()) return codeFiles(root, path);
    return CODE.test(e.name) && !e.name.endsWith('.d.ts') ? [path] : [];
  });
}

/** A CLI target (`api`, `apps/api`, a path inside an app) as its repo-relative path. */
export function targetPath(root, arg) {
  const rel = posix.normalize(arg.replace(/\\/g, '/')).replace(/\/$/, '');
  if (!rel.includes('/') && existsSync(posix.join(root, 'apps', rel))) return `apps/${rel}`;
  return rel;
}

const scopeOf = (rel) => /^apps\/[^/]+/.exec(rel)?.[0];

/** The alias of the app that `rel` sits in; throws for a path outside such an app. */
function aliasFor(root, rel) {
  const scope = scopeOf(rel);
  const alias = scope === undefined ? undefined : aliasOf(root, scope);
  if (alias === undefined) throw new Error(`${rel}: not inside an app with a package.json "imports" "#/*"`);
  return alias;
}

const emptyRow = (workspace) => ({ workspace, files: 0, changed: 0, rewritten: 0, kept: 0 });

/** Rewrites (or with `write: false` only counts) every target; one report row per workspace. */
export function run(root, { targets, write }) {
  const project = new Project({ useInMemoryFileSystem: true, skipFileDependencyResolution: true });
  const rows = new Map();
  for (const rel of targets.map((t) => targetPath(root, t))) {
    const alias = aliasFor(root, rel);
    const row = rows.get(alias.scope) ?? emptyRow(alias.scope);
    rows.set(alias.scope, row);
    for (const file of codeFiles(root, rel)) {
      const text = readFileSync(posix.join(root, file), 'utf8');
      const out = rewriteText(project, alias, { file, text });
      row.files += 1;
      row.rewritten += out.rewritten;
      row.kept += out.kept;
      if (out.text === text) continue;
      row.changed += 1;
      if (write) writeFileSync(posix.join(root, file), out.text);
    }
  }
  return [...rows.values()];
}

function main(args) {
  const root = fileURLToPath(new URL('../../..', import.meta.url)).replace(/\\/g, '/');
  const targets = args.filter((a) => a !== '--write' && a !== '--');
  if (targets.length === 0) {
    throw new Error('usage: pnpm imports:absolute -- <workspace|paths…> [--write]');
  }
  const write = args.includes('--write');
  const rows = run(root, { targets, write });
  console.log(write ? 'absolute imports (written):' : 'absolute imports (dry run, nothing written):');
  for (const r of rows) {
    const kept = `${r.kept} kept (outside the alias folder)`;
    console.log(`  ${r.workspace}: ${r.rewritten} specifiers in ${r.changed} of ${r.files} files; ${kept}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main(process.argv.slice(2));
