// The extensionless codemod (docs/64 PR 2): packages ship TypeScript source that every consumer
// resolves without extensions, so a relative module path in packages/* names neither `.js`/`.ts`
// nor `/index`. Rewrites imports, re-exports, `import()`, `import('x').T`, require and vi/jest
// mock paths (move-module/specifiers.ts finds them); data and asset paths (`.json`, `.png`, `.css`)
// keep theirs. A folder import beside a same-named file would change target: it stops the run.
// Deterministic (sorted files, span edits only): a second run finds nothing.
// Usage: pnpm imports:extensionless [--write]   (dry run without --write)
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Project } from 'ts-morph';
import { applyEdits, specifierNodes } from '../ci-checks/move-module/specifiers.ts';

const TS = /\.[cm]?tsx?$/;
const SKIP = new Set(['node_modules', 'dist', 'coverage', '.expo', '.turbo']);
const RELATIVE = /^\.{1,2}(\/|$)/;
const INDEX = /(^|\/)index(\.[cm]?[jt]sx?)?$/;
const CODE_EXT = /\.[cm]?[jt]sx?$/;
const SOURCE_EXTS = ['.ts', '.tsx'];

const parentOf = (spec) => (spec === 'index' ? '.' : spec.replace(/\/index$/, ''));

/** `spec` without its code extension or `/index`; null when it has neither or is not relative. */
export function bareSpec(spec) {
  if (!RELATIVE.test(spec)) return null;
  const match = INDEX.exec(spec);
  if (match !== null) return parentOf(spec.replace(CODE_EXT, '')).replace(/^$/, '.');
  return CODE_EXT.test(spec) ? spec.replace(CODE_EXT, '') : null;
}

const fromIndex = (spec) => INDEX.test(spec) && RELATIVE.test(spec);

function assertNoClash({ file, spec, bare }, isFile) {
  const target = posix.normalize(posix.join(posix.dirname(file), bare));
  const clash = SOURCE_EXTS.map((ext) => `${target}${ext}`).find((path) => isFile(path));
  if (clash === undefined) return;
  throw new Error(`${file}: '${spec}' would resolve to ${posix.basename(clash)}`);
}

/** `file`'s text with bare relative paths; throws when a folder import would change target. */
export function rewriteText(project, { file, text }, isFile) {
  const sf = project.createSourceFile(`/virtual/${file}`, text, { overwrite: true });
  const specs = specifierNodes(sf);
  project.removeSourceFile(sf);
  const edits = specs.flatMap((s) => {
    const bare = bareSpec(s.value);
    if (bare === null) return [];
    if (fromIndex(s.value)) assertNoClash({ file, spec: s.value, bare }, isFile);
    return [{ start: s.start, end: s.end, value: bare }];
  });
  return { text: edits.length === 0 ? text : applyEdits(text, edits), rewritten: edits.length };
}

function tsFiles(root, rel) {
  const byName = (a, b) => (a.name < b.name ? -1 : 1);
  const entries = readdirSync(posix.join(root, rel), { withFileTypes: true }).sort(byName);
  return entries.flatMap((e) => {
    const path = posix.join(rel, e.name);
    if (SKIP.has(e.name)) return [];
    if (e.isDirectory()) return tsFiles(root, path);
    return TS.test(e.name) ? [path] : [];
  });
}

/** Every TypeScript file under packages/* (repo-relative, sorted), skipping vendored output. */
export const packageFiles = (root) => tsFiles(root, 'packages');

const workspaceOf = (file) => file.split('/').slice(0, 2).join('/');

/** Rewrites (or with `write: false` only counts) every package file; one row per package. */
export function run(root, { write }) {
  const project = new Project({ useInMemoryFileSystem: true, skipFileDependencyResolution: true });
  const isFile = (rel) => existsSync(posix.join(root, rel));
  const rows = new Map();
  for (const file of packageFiles(root)) {
    const workspace = workspaceOf(file);
    const row = rows.get(workspace) ?? { workspace, files: 0, changed: 0, rewritten: 0 };
    rows.set(workspace, row);
    const text = readFileSync(posix.join(root, file), 'utf8');
    const out = rewriteText(project, { file, text }, isFile);
    row.files += 1;
    row.rewritten += out.rewritten;
    if (out.text === text) continue;
    row.changed += 1;
    if (write) writeFileSync(posix.join(root, file), out.text);
  }
  return [...rows.values()];
}

function main(args) {
  const root = fileURLToPath(new URL('../../..', import.meta.url)).replace(/\\/g, '/');
  const write = args.includes('--write');
  const rows = run(root, { write });
  console.log(write ? 'extensionless (written):' : 'extensionless (dry run, nothing written):');
  for (const r of rows) {
    console.log(`  ${r.workspace}: ${r.rewritten} specifiers in ${r.changed} of ${r.files} files`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main(process.argv.slice(2));
