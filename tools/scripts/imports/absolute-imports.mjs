// The absolute-imports codemod (owner 2026-10-30: «use the absolute paths for imports», docs/32
// R12). Rewrites every parent-relative module path (`../x`) of a workspace with a `@/*` alias to
// that alias (`@/x`): static imports, re-exports, `import()`, `import('x').T`, require and the
// vi / jest mock paths (move-module/specifiers.ts finds them). A sibling (`./x`) and a path that
// leaves the alias folder (`../package.json` from src/, `../(tabs)/x` in mobile app/) stay;
// nothing else changes. Deterministic (sorted files, span edits only): a second run finds nothing.
// Usage: pnpm imports:absolute -- <workspace|paths…> [--write]   (dry run without --write)
//   workspace: api, web, mobile or apps/<name>; paths: files or folders inside one or more apps.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Project, ts } from 'ts-morph';
import { applyEdits, specifierNodes } from '../ci-checks/move-module/specifiers.ts';

const CODE = /\.[cm]?[jt]sx?$/;
const SKIP = new Set(['node_modules', 'dist', 'coverage', '.expo', '.turbo', 'playwright-report', 'test-results']);

/** `{ scope: 'apps/web', dir: 'apps/web/src' }` from the app tsconfig's `@/*` path. */
export function aliasOf(root, scope) {
  const file = posix.join(root, scope, 'tsconfig.json');
  if (!existsSync(file)) return undefined;
  const { config } = ts.parseConfigFileTextToJson(file, readFileSync(file, 'utf8'));
  const target = config?.compilerOptions?.paths?.['@/*']?.[0];
  if (typeof target !== 'string' || !target.endsWith('/*')) return undefined;
  return { scope, dir: posix.join(scope, target.slice(0, -2)) };
}

/** The alias form of `spec` written in `file` (repo-relative), or null when it stays as it is. */
export function absoluteSpec(alias, file, spec) {
  if (spec !== '..' && !spec.startsWith('../')) return null;
  const to = posix.normalize(posix.join(posix.dirname(file), spec)).replace(/\/$/, '');
  if (!to.startsWith(`${alias.dir}/`)) return null;
  return `@/${to.slice(alias.dir.length + 1)}`;
}

/** `file`'s text with its parent-relative paths rewritten; `kept`: the `../` ones left as is. */
export function rewriteText(project, alias, { file, text }) {
  const sf = project.createSourceFile(`/virtual/${file}`, text, { overwrite: true });
  const parents = specifierNodes(sf).filter((s) => s.value === '..' || s.value.startsWith('../'));
  project.removeSourceFile(sf);
  const edits = parents.flatMap((s) => {
    const value = absoluteSpec(alias, file, s.value);
    return value === null ? [] : [{ start: s.start, end: s.end, value }];
  });
  const out = edits.length === 0 ? text : applyEdits(text, edits);
  return { text: out, rewritten: edits.length, kept: parents.length - edits.length };
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
  if (alias === undefined) throw new Error(`${rel}: not inside an app with a tsconfig "@/*" path`);
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
