// Check 6 of the package-boundary gate (CLAUDE.md rule 23, docs/32 R7): per workspace, the files
// whose import or export-from of '@ab/shared' names something an owner package holds. On a PR the
// count may not rise against the base branch, so no new facade use lands while the sweep drains it.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ts } from 'ts-morph';
import { facadeOwners } from '../../imports/owner-names.ts';
import { codeFilesOf } from './packages-scan.mjs';
import { resolver, workspaces } from './packages-workspaces.mjs';

const FACADE = '@ab/shared';
const MENTIONS = /['"]@ab\/shared['"]/;

const isFacadeDecl = (s) =>
  (ts.isImportDeclaration(s) || ts.isExportDeclaration(s)) && s.moduleSpecifier?.text === FACADE;

const bindingsOf = (s) =>
  ts.isImportDeclaration(s) ? s.importClause?.namedBindings : s.exportClause;

const isNamed = (b) => b !== undefined && (ts.isNamedImports(b) || ts.isNamedExports(b));

/** The names `path` imports or re-exports from the facade by name (not `*`, not a namespace). */
function facadeNames(path, text) {
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest);
  return sf.statements
    .filter(isFacadeDecl)
    .map(bindingsOf)
    .filter(isNamed)
    .flatMap((b) => b.elements.map((e) => (e.propertyName ?? e.name).text));
}

/** `{ workspace: n }`: the files of each workspace naming an owner-held name through the facade. */
export function facadeCounts(root) {
  const owners = facadeOwners(root);
  const at = resolver(workspaces(root));
  const counts = {};
  for (const path of codeFilesOf(root, at)) {
    const text = readFileSync(join(root, path), 'utf8');
    const hit = MENTIONS.test(text) && facadeNames(path, text).some((n) => owners.has(n));
    const ws = at.owner(path);
    if (hit) counts[ws] = (counts[ws] ?? 0) + 1;
  }
  return counts;
}

export const withFacade = (root, facts) => ({
  ...facts,
  counts: { ...facts.counts, facade: facadeCounts(root) },
});
