// The kit-entries codemod (docs/32 R12, docs/51 §2): an app reaches @ab/web-kit only through its
// package.json `exports` (one entry per area: `@ab/web-kit/form`, `@ab/web-kit/i18n`). Rewrites
// every `@ab/web-kit/<deep path>` (imports, re-exports, `import()`, `import('x').T`, require
// and vi / jest mocks) to the entry whose index.ts re-exports that file. A path no entry
// re-exports is reported: add its names to the area's index.ts, then run again. A mock of an
// entry mocks it for the kit's own files too, as they import another area through its index.ts.
// Usage: pnpm imports:kit -- <workspace|paths…> [--write]   (dry run without --write)
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Project } from 'ts-morph';
import { z } from 'zod';
import { readJson } from '../ci-checks/lint/json-file.mjs';
import { applyEdits, specifierNodes } from '../ci-checks/move-module/specifiers.ts';
import { codeFiles, targetPath } from './absolute-imports.mjs';

const KIT = 'packages/web-kit';
const PREFIX = '@ab/web-kit/';
const TRIES = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
const manifest = z.object({ exports: z.record(z.string(), z.string()) });
const project = new Project({ useInMemoryFileSystem: true, skipFileDependencyResolution: true });

const isFile = (root, rel) => {
  const abs = posix.join(root, rel);
  return existsSync(abs) && statSync(abs).isFile();
};
const fileOf = (root, path) => TRIES.map((t) => path + t).find((p) => isFile(root, p));

/** The kit file a barrel's `spec` names: a sibling path or the kit's own `#/`. */
const reexported = (root, { barrel, spec }) => {
  const own = spec.startsWith('#/') ? posix.join(KIT, 'src', spec.slice(2)) : null;
  return fileOf(root, own ?? posix.join(posix.dirname(barrel), spec));
};

function sourcesOf(root, file) {
  const text = readFileSync(posix.join(root, file), 'utf8');
  const sf = project.createSourceFile(`/kit/${file}`, text, { overwrite: true });
  const specs = sf.getExportDeclarations().map((d) => d.getModuleSpecifierValue());
  project.removeSourceFile(sf);
  return specs.filter((s) => s !== undefined);
}

/** Adds to `out` every file the barrel `index` re-exports for `entry`, through nested barrels. */
function walk(root, { out, entry, index }) {
  const queue = [index];
  for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
    if (out.has(file) || !/\.tsx?$/.test(file)) continue;
    out.set(file, entry);
    const next = sourcesOf(root, file).map((spec) => reexported(root, { barrel: file, spec }));
    queue.push(...next.filter((f) => f !== undefined));
  }
}

/** `Map<kit file, entry name>`: every file an entry's index re-exports, nested barrels too. */
export function entryFiles(root) {
  const { exports } = readJson(posix.join(root, KIT, 'package.json'), manifest);
  const out = new Map();
  for (const [key, target] of Object.entries(exports)) {
    walk(root, { out, entry: key.slice(2), index: posix.join(KIT, target) });
  }
  return out;
}

/** The entry a kit path goes through: itself when it is one, else the entry re-exporting it. */
function entryOf(root, { entries, path }) {
  const names = new Set(entries.values());
  if (names.has(path)) return { entry: path, same: true };
  const kitFile = fileOf(root, posix.join(KIT, 'src', path));
  return { entry: kitFile === undefined ? undefined : entries.get(kitFile), same: false };
}

/** `file`'s text with its deep kit paths rewritten, and the deep paths no entry re-exports. */
function rewriteFile(root, { file, entries }) {
  const text = readFileSync(posix.join(root, file), 'utf8');
  const sf = project.createSourceFile(`/app/${file}`, text, { overwrite: true });
  const kit = specifierNodes(sf).filter((s) => s.value.startsWith(PREFIX));
  project.removeSourceFile(sf);
  const found = kit.map((s) => {
    const path = s.value.slice(PREFIX.length);
    return { ...s, ...entryOf(root, { entries, path }) };
  });
  const edits = found
    .filter((s) => s.entry !== undefined && !s.same)
    .map((s) => ({ start: s.start, end: s.end, value: PREFIX + s.entry }));
  const missing = found.filter((s) => s.entry === undefined).map((s) => `${file}: ${s.value}`);
  const out = edits.length === 0 ? text : applyEdits(text, edits);
  return { text: out, rewritten: edits.length, missing };
}

/** Rewrites (or with `write: false` only counts) every target's deep kit paths. */
export function runKit(root, { targets, write }) {
  const entries = entryFiles(root);
  const sum = { files: 0, rewritten: 0, missing: [] };
  for (const file of targets.flatMap((t) => codeFiles(root, targetPath(root, t)))) {
    const out = rewriteFile(root, { file, entries });
    sum.files += 1;
    sum.rewritten += out.rewritten;
    sum.missing.push(...out.missing);
    if (write && out.rewritten > 0) writeFileSync(posix.join(root, file), out.text);
  }
  return sum;
}

function main(args) {
  const root = fileURLToPath(new URL('../../..', import.meta.url)).replace(/\\/g, '/');
  const targets = args.filter((a) => a !== '--write' && a !== '--');
  if (targets.length === 0) {
    throw new Error('usage: pnpm imports:kit -- <workspace|paths…> [--write]');
  }
  const write = args.includes('--write');
  const { files, rewritten, missing } = runKit(root, { targets, write });
  const mode = write ? 'written' : 'dry run';
  console.log(`kit entries (${mode}): ${rewritten} specifiers in ${files} files`);
  missing.forEach((m) => console.log(`  not exported by any entry: ${m}`));
  process.exitCode = missing.length === 0 ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main(process.argv.slice(2));
