import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { posix } from 'node:path';
import { Project } from 'ts-morph';
import { rewriteKitImports } from './rewrite.mjs';

const TS = /\.[cm]?tsx?$/;
const SKIP = new Set(['node_modules', 'dist', 'coverage', '.expo', '.turbo']);

function tsFiles(root, rel) {
  const entries = readdirSync(posix.join(root, rel), { withFileTypes: true });
  return entries
    .filter((e) => !SKIP.has(e.name))
    .flatMap((e) => {
      const path = posix.join(rel, e.name);
      if (e.isDirectory()) return tsFiles(root, path);
      return TS.test(e.name) ? [path] : [];
    });
}

/** Rewrites (with `write`) or counts every app file; returns what changed and what needs a person. */
export function run(root, { write, table }) {
  const project = new Project({ useInMemoryFileSystem: true, skipFileDependencyResolution: true });
  const report = { changed: [], rewritten: 0, manual: [] };
  for (const file of tsFiles(root, 'apps').sort()) {
    const text = readFileSync(posix.join(root, file), 'utf8');
    const out = rewriteKitImports(project, { file, text }, table);
    report.rewritten += out.rewritten;
    report.manual.push(...out.manual);
    if (out.text === text) continue;
    report.changed.push(file);
    if (write) writeFileSync(posix.join(root, file), out.text);
  }
  return report;
}
