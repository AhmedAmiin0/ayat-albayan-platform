// The db-unwrap codemod (docs/62 part 1 §3.1): moves apps/api off the two dbError copies onto
// common/db/errors. Deterministic (sorted files, span edits only); a second run finds nothing.
// Usage: node tools/scripts/imports/db-unwrap/db-unwrap.mjs [--write]   (dry run without it)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Project, SyntaxKind } from 'ts-morph';
import { applyEdits } from '../../ci-checks/move-module/specifiers.ts';
import {
  ERRORS_SOURCE,
  NAMES,
  callEdit,
  dbErrorImport,
  isDbErrorCall,
  siteEdit,
} from './rewrite.mjs';

const TEST = /\.test\.ts$|\.test-util\.ts$/;
const isName = (id) => {
  const parent = id.getParent();
  const kinds = [SyntaxKind.PropertyAccessExpression, SyntaxKind.PropertyAssignment];
  return kinds.includes(parent.getKind()) && parent.getNameNode() === id;
};

const TYPE_ONLY = /^type\s+/;

/** `import type { … }` when every name left is type-only, as no-import-type-side-effects asks. */
function importLine(names, source) {
  const types = names.every((n) => TYPE_ONLY.test(n));
  const list = types ? names.map((n) => n.replace(TYPE_ONLY, '')) : names;
  return `import ${types ? 'type ' : ''}{ ${list.join(', ')} } from '${source}';`;
}

/** The dbError import, replaced in place by what the file still needs from it and the helpers. */
function importEdits(found, ctx) {
  const specs = found.decl.getNamedImports();
  const keep = ctx.unmapped.length > 0 ? ['dbError'] : [];
  const people = found.people ? ['peopleErrors'] : [];
  const swap = (n) => (n.getName() === 'dbError' ? [...keep, ...people] : [n.getText()]);
  const names = specs.flatMap(swap);
  const source = found.decl.getModuleSpecifierValue();
  const helpers = [...ctx.used].filter((n) => n !== 'peopleErrors').sort();
  const lines = [
    ...(names.length ? [importLine(names, source)] : []),
    ...(helpers.length ? [`import { ${helpers.join(', ')} } from '${ERRORS_SOURCE}';`] : []),
  ];
  const end = found.decl.getEnd() + (lines.length ? 0 : 1);
  return [{ start: found.decl.getStart(), end, value: lines.join('\n') }];
}

/** `text` moved onto common/db/errors, with the dbError references it could not map. */
export function rewriteText(project, { file, text }) {
  const sf = project.createSourceFile(`/virtual/${file}`, text, { overwrite: true });
  const found = dbErrorImport(sf);
  if (found === null || found.unknown) {
    project.removeSourceFile(sf);
    return {
      text,
      sites: 0,
      calls: 0,
      unmapped: found ? [`${file}: dbError from ${found.unknown}`] : [],
    };
  }
  const ids = sf.getDescendantsOfKind(SyntaxKind.Identifier).filter((id) => !isName(id));
  const ctx = { people: found.people, used: new Set(), unmapped: [] };
  ctx.taken = new Set(ids.map((id) => id.getText()).filter((t) => NAMES.includes(t)));
  const sites = sf
    .getDescendantsOfKind(SyntaxKind.IfStatement)
    .map((s) => siteEdit(s, ctx))
    .filter(Boolean);
  const covered = new Set(sites.map((s) => s.covers));
  const calls = sf
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter((c) => isDbErrorCall(c) && !covered.has(c))
    .map((c) => callEdit(c, ctx));
  const callNodes = sf.getDescendantsOfKind(SyntaxKind.CallExpression).filter(isDbErrorCall);
  const refs = ids.filter(
    (id) => id.getText() === 'dbError' && !callNodes.includes(id.getParent()),
  );
  ctx.unmapped = refs
    .filter((id) => !id.getFirstAncestorByKind(SyntaxKind.ImportDeclaration))
    .map((id) => `${file}:${id.getStartLineNumber()}: ${id.getParent().getText().slice(0, 60)}`);
  if (found.people) ctx.used.add('peopleErrors');
  const edits = [...sites, ...calls, ...importEdits(found, ctx)];
  project.removeSourceFile(sf);
  return {
    text: applyEdits(text, edits),
    sites: sites.length,
    calls: calls.length,
    unmapped: ctx.unmapped,
  };
}

function apiFiles(root, rel) {
  const entries = readdirSync(posix.join(root, rel), { withFileTypes: true });
  return entries
    .sort((a, b) => (a.name < b.name ? -1 : 1))
    .flatMap((e) => {
      const path = posix.join(rel, e.name);
      if (e.isDirectory()) return apiFiles(root, path);
      return e.name.endsWith('.ts') && !TEST.test(e.name) ? [path] : [];
    });
}

/** Rewrites (or with `write: false` only counts) every api source file that imports dbError. */
export function run(root, { write }) {
  const project = new Project({ useInMemoryFileSystem: true, skipFileDependencyResolution: true });
  const total = { files: 0, sites: 0, calls: 0, unmapped: [], changed: [] };
  for (const file of apiFiles(root, 'apps/api/src')) {
    const text = readFileSync(posix.join(root, file), 'utf8');
    const out = rewriteText(project, { file, text });
    total.sites += out.sites;
    total.calls += out.calls;
    total.unmapped.push(...out.unmapped);
    if (out.text === text) continue;
    total.changed.push(file);
    if (write) writeFileSync(posix.join(root, file), out.text);
  }
  return total;
}

function main(args) {
  const root = fileURLToPath(new URL('../../../..', import.meta.url)).replace(/\\/g, '/');
  const t = run(root, { write: args.includes('--write') });
  console.log(
    `db-unwrap: ${t.sites} sites to helpers, ${t.calls} calls to pgError, ${t.changed.length} files`,
  );
  for (const line of t.unmapped) console.log(`  not mapped: ${line}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main(process.argv.slice(2));
